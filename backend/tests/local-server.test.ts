import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createLocalServer, seedLocalDemoAppointments } from '../src/server.js';
import { SHARDA_HOSPITAL_ID } from '../src/repositories/in-memory/seed-data.js';

describe('Local HTTP Server Adapter & API Compatibility', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    await seedLocalDemoAppointments();
    server = createLocalServer();
    await new Promise<void>((resolve) => {
      // Listen on random available port
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  test('GET /health returns 200 with healthy status and CORS headers', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    const data = await res.json();
    assert.equal(data.status, 'healthy');
  });

  test('OPTIONS preflight request returns 204 with CORS allow headers', async () => {
    const res = await fetch(`${baseUrl}/hospitals`, { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.ok(res.headers.get('access-control-allow-methods')?.includes('GET'));
  });

  test('GET /hospitals?city=Greater+Noida returns paginated hospital catalog', async () => {
    const res = await fetch(`${baseUrl}/hospitals?city=Greater+Noida&pageSize=6`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.totalCount >= 5);
    assert.ok(data.items.length <= 6);
    const sharda = data.items.find((h: { hospitalId: string }) => h.hospitalId === SHARDA_HOSPITAL_ID);
    assert.ok(sharda, 'Expected Sharda Hospital to be in catalog items');
    assert.equal(sharda.name, 'Sharda Hospital');
  });

  test('GET /hospitals/:hospitalId resolves both UUID and legacy alias', async () => {
    // Via UUID
    const res1 = await fetch(`${baseUrl}/hospitals/${SHARDA_HOSPITAL_ID}`);
    assert.equal(res1.status, 200);
    const h1 = await res1.json();
    assert.equal(h1.name, 'Sharda Hospital');

    // Via alias
    const res2 = await fetch(`${baseUrl}/hospitals/hosp-sharda-001`);
    assert.equal(res2.status, 200);
    const h2 = await res2.json();
    assert.equal(h2.name, 'Sharda Hospital');
  });

  test('POST /auth/login with demo credentials authenticates and yields mock JWT', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sharda-admin@example.com',
        password: 'AdminPassword123!',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.accessToken);
    assert.ok(data.roles.includes('hospital_admin'));
    assert.equal(data.userId, 'admin-sharda-001');

    // Verify authenticated request to /admin/appointments
    const apptRes = await fetch(`${baseUrl}/admin/appointments?page=1&pageSize=10`, {
      headers: {
        Authorization: `Bearer ${data.accessToken}`,
      },
    });

    assert.equal(apptRes.status, 200);
    const appts = await apptRes.json();
    assert.ok(appts.totalCount >= 1);
    assert.ok(Array.isArray(appts.items));
  });

  test('GET /admin/appointments without authorization token returns 401', async () => {
    const res = await fetch(`${baseUrl}/admin/appointments`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error.code, 'ERR_UNAUTHORIZED');
  });
});
