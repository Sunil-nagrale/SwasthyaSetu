import { IHospitalRepository } from '../src/repositories/interfaces/hospital.repository.js';
import { IHospitalAdminMappingRepository } from '../src/repositories/interfaces/hospital-admin-mapping.repository.js';
import { IUserRepository } from '../src/repositories/interfaces/user.repository.js';
import {
  SEED_HOSPITALS,
  SEED_DEPARTMENTS,
  SEED_DOCTORS,
  SEED_SCHEDULES,
  SEED_BREAK_LEAVES,
  SEED_LAB_TESTS,
  SEED_HOSPITAL_ADMIN_MAPPINGS,
  SEED_PATIENT_PROFILES,
} from '../src/repositories/in-memory/seed-data.js';
import { appContainer } from '../src/repositories/container.js';

export interface SeedOptions {
  hospitalRepo?: IHospitalRepository;
  adminMappingRepo?: IHospitalAdminMappingRepository;
  userRepo?: IUserRepository;
  log?: (message: string) => void;
}

export interface SeedSummary {
  hospitals: number;
  departments: number;
  doctors: number;
  schedules: number;
  breakLeaves: number;
  labTests: number;
  adminMappings: number;
  patientProfiles: number;
}

/**
 * Idempotently seeds hospitals, departments, doctors, schedules, break/leaves,
 * lab tests, hospital-admin mappings, and initial patient profiles.
 *
 * Safe to execute repeatedly: replaces/puts items with predictable keys
 * without duplicating records.
 *
 * Never prints secret values or environment variables.
 */
export async function seedDatabase(options: SeedOptions = {}): Promise<SeedSummary> {
  const log = options.log ?? ((msg: string) => console.log(msg));
  const hospitalRepo = options.hospitalRepo ?? appContainer.hospitalRepo;
  const adminMappingRepo = options.adminMappingRepo ?? appContainer.hospitalAdminMappingRepo;
  const userRepo = options.userRepo ?? appContainer.userRepo;

  log('Starting database seed...');

  // 1. Hospitals (including Sharda Hospital and Max Hospital)
  for (const h of SEED_HOSPITALS) {
    await hospitalRepo.createHospital(h);
  }
  log(`Seeded ${SEED_HOSPITALS.length} hospitals.`);

  // 2. Departments
  for (const d of SEED_DEPARTMENTS) {
    await hospitalRepo.createDepartment(d);
  }
  log(`Seeded ${SEED_DEPARTMENTS.length} departments.`);

  // 3. Doctors
  for (const doc of SEED_DOCTORS) {
    await hospitalRepo.createDoctor(doc);
  }
  log(`Seeded ${SEED_DOCTORS.length} doctors.`);

  // 4. Schedules
  for (const s of SEED_SCHEDULES) {
    await hospitalRepo.createSchedule(s);
  }
  log(`Seeded ${SEED_SCHEDULES.length} schedules.`);

  // 5. Break / Leaves
  for (const bl of SEED_BREAK_LEAVES) {
    await hospitalRepo.createBreakLeave(bl);
  }
  log(`Seeded ${SEED_BREAK_LEAVES.length} break/leave records.`);

  // 6. Laboratory Tests
  for (const lab of SEED_LAB_TESTS) {
    await hospitalRepo.createLabTest(lab);
  }
  log(`Seeded ${SEED_LAB_TESTS.length} laboratory tests.`);

  // 7. Hospital-Admin Mappings (Sharda and Max hospital admin accounts)
  for (const mapping of SEED_HOSPITAL_ADMIN_MAPPINGS) {
    await adminMappingRepo.saveMapping(mapping);
  }
  log(`Seeded ${SEED_HOSPITAL_ADMIN_MAPPINGS.length} hospital-admin mappings.`);

  // 8. Patient Profiles
  for (const profile of SEED_PATIENT_PROFILES) {
    await userRepo.saveProfile(profile);
  }
  log(`Seeded ${SEED_PATIENT_PROFILES.length} patient profiles.`);

  log('Database seed completed successfully.');

  return {
    hospitals: SEED_HOSPITALS.length,
    departments: SEED_DEPARTMENTS.length,
    doctors: SEED_DOCTORS.length,
    schedules: SEED_SCHEDULES.length,
    breakLeaves: SEED_BREAK_LEAVES.length,
    labTests: SEED_LAB_TESTS.length,
    adminMappings: SEED_HOSPITAL_ADMIN_MAPPINGS.length,
    patientProfiles: SEED_PATIENT_PROFILES.length,
  };
}

// Standalone script execution
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));

if (isMain) {
  seedDatabase().catch((err: unknown) => {
    console.error('Database seeding failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
