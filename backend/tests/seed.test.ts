import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { seedDatabase } from '../scripts/seed.js';
import { InMemoryHospitalRepository } from '../src/repositories/in-memory/in-memory-hospital.repository.js';
import { InMemoryHospitalAdminMappingRepository } from '../src/repositories/in-memory/in-memory-hospital-admin-mapping.repository.js';
import { InMemoryUserRepository } from '../src/repositories/in-memory/in-memory-user.repository.js';
import {
  SHARDA_HOSPITAL_ID,
  SHARDA_ADMIN_USER_ID,
  MAX_HOSPITAL_ID,
  MAX_ADMIN_USER_ID,
  SEED_HOSPITALS,
} from '../src/repositories/in-memory/seed-data.js';

describe('Database Seed Script (Idempotency & Data Integrity)', () => {
  test('seeds all hospitals, departments, doctors, schedules, labs, and mappings safely', async () => {
    const hospitalRepo = new InMemoryHospitalRepository();
    const adminMappingRepo = new InMemoryHospitalAdminMappingRepository();
    const userRepo = new InMemoryUserRepository();

    const loggedMessages: string[] = [];
    const summary = await seedDatabase({
      hospitalRepo,
      adminMappingRepo,
      userRepo,
      log: (msg) => loggedMessages.push(msg),
    });

    // 1. Verify summary counts
    assert.equal(summary.hospitals, SEED_HOSPITALS.length);
    assert.ok(summary.departments >= 3);
    assert.ok(summary.doctors >= 3);
    assert.ok(summary.schedules >= 2);
    assert.ok(summary.breakLeaves >= 1);
    assert.ok(summary.labTests >= 3);
    assert.equal(summary.adminMappings, 2);
    assert.equal(summary.patientProfiles, 1);

    // 2. Verify Sharda Hospital data integrity
    const sharda = await hospitalRepo.getHospitalById(SHARDA_HOSPITAL_ID);
    assert.ok(sharda);
    assert.equal(sharda.name, 'Sharda Hospital');
    assert.equal(sharda.city, 'Greater Noida');

    const shardaDepts = await hospitalRepo.getDepartments(SHARDA_HOSPITAL_ID);
    assert.ok(shardaDepts.some((d) => d.name === 'Cardiology'));

    const shardaDoctors = await hospitalRepo.getDoctors(SHARDA_HOSPITAL_ID);
    assert.ok(shardaDoctors.some((doc) => doc.name === 'Dr. Ramesh Sharma'));

    const shardaLabs = await hospitalRepo.getLabTests(SHARDA_HOSPITAL_ID);
    assert.ok(shardaLabs.some((l) => l.testName.includes('Lipid Profile')));

    // 3. Verify Hospital Admin Mappings for cross-hospital isolation
    const shardaMapping = await adminMappingRepo.getMappingByUserId(SHARDA_ADMIN_USER_ID);
    assert.equal(shardaMapping?.hospitalId, SHARDA_HOSPITAL_ID);

    const maxMapping = await adminMappingRepo.getMappingByUserId(MAX_ADMIN_USER_ID);
    assert.equal(maxMapping?.hospitalId, MAX_HOSPITAL_ID);

    // 4. Verify no secrets, passwords, or tokens in logs
    for (const msg of loggedMessages) {
      assert.ok(!msg.includes('secret'));
      assert.ok(!msg.includes('password'));
      assert.ok(!msg.includes('AWS_SECRET'));
      assert.ok(!msg.includes('KEY'));
    }
  });

  test('running seed twice is idempotent and does not produce duplicate records', async () => {
    const hospitalRepo = new InMemoryHospitalRepository();
    const adminMappingRepo = new InMemoryHospitalAdminMappingRepository();
    const userRepo = new InMemoryUserRepository();

    const firstRun = await seedDatabase({
      hospitalRepo,
      adminMappingRepo,
      userRepo,
      log: () => {},
    });

    const secondRun = await seedDatabase({
      hospitalRepo,
      adminMappingRepo,
      userRepo,
      log: () => {},
    });

    assert.deepEqual(firstRun, secondRun);

    const hospitalsList = await hospitalRepo.findHospitals({}, 1, 100);
    assert.equal(hospitalsList.totalCount, SEED_HOSPITALS.length);

    const shardaDepts = await hospitalRepo.getDepartments(SHARDA_HOSPITAL_ID);
    assert.equal(shardaDepts.length, 3);

    const shardaDoctors = await hospitalRepo.getDoctors(SHARDA_HOSPITAL_ID);
    assert.equal(shardaDoctors.length, 3);
  });
});
