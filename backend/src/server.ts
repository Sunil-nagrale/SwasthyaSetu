import http from 'node:http';
import { env } from './config/env.js';
import { handler } from './lambda.js';
import type { APIGatewayProxyEvent } from './types/aws.js';
import { inMemoryAppointmentRepo } from './repositories/in-memory/in-memory-appointment.repository.js';
import {
  SHARDA_HOSPITAL_ID,
  SHARDA_DOCTOR_ID,
} from './repositories/in-memory/seed-data.js';

export function createLocalServer(): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');

      const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const queryStringParameters: Record<string, string> = {};
      parsedUrl.searchParams.forEach((val, key) => {
        queryStringParameters[key] = val;
      });

      const headers: Record<string, string> = {};
      for (const [key, val] of Object.entries(req.headers)) {
        if (typeof val === 'string') {
          headers[key] = val;
        } else if (Array.isArray(val)) {
          headers[key] = val.join(', ');
        }
      }

      const method = req.method?.toUpperCase() ?? 'GET';
      const path = parsedUrl.pathname;

      const event: APIGatewayProxyEvent = {
        httpMethod: method,
        path,
        headers,
        queryStringParameters: Object.keys(queryStringParameters).length > 0 ? queryStringParameters : null,
        pathParameters: null,
        body: rawBody.length > 0 ? rawBody : null,
        isBase64Encoded: false,
        requestContext: {
          httpMethod: method,
          path,
          requestId: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        },
      };

      const result = await handler(event);

      res.writeHead(result.statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        ...(result.headers ?? {}),
      });

      if (result.body) {
        res.end(result.body);
      } else {
        res.end();
      }
    } catch (err: unknown) {
      console.error('Local server error:', err);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: err instanceof Error ? err.message : 'Internal server error',
          },
        })
      );
    }
  });
}

export async function seedLocalDemoAppointments(): Promise<void> {
  const existing = await inMemoryAppointmentRepo.listByHospital(SHARDA_HOSPITAL_ID, 1, 10);
  if (existing.totalCount === 0) {
    await inMemoryAppointmentRepo.createAppointment({
      appointmentId: 'appt-demo-001',
      patientId: 'patient-test-001',
      hospitalId: SHARDA_HOSPITAL_ID,
      doctorId: SHARDA_DOCTOR_ID,
      status: 'pending',
      preferredDate: '2026-09-22',
      preferredTime: '10:00',
      patientVisitNote: 'Follow-up consultation for blood pressure review',
      hospitalSnapshot: {
        hospitalId: SHARDA_HOSPITAL_ID,
        name: 'Sharda Hospital',
      },
      doctorSnapshot: {
        doctorId: SHARDA_DOCTOR_ID,
        name: 'Dr. Ramesh Sharma',
        specialty: 'Cardiology',
      },
      patientSnapshot: {
        patientId: 'patient-test-001',
        name: 'Ravi Kumar',
        email: 'patient@example.com',
        phone: '+91-9876543210',
      },
      createdAt: '2026-09-20T08:00:00.000Z',
      updatedAt: '2026-09-20T08:00:00.000Z',
    });

    await inMemoryAppointmentRepo.createAppointment({
      appointmentId: 'appt-demo-002',
      patientId: 'patient-test-001',
      hospitalId: SHARDA_HOSPITAL_ID,
      doctorId: SHARDA_DOCTOR_ID,
      status: 'accepted',
      preferredDate: '2026-09-25',
      preferredTime: '11:30',
      patientVisitNote: 'Routine cardiology evaluation',
      hospitalSnapshot: {
        hospitalId: SHARDA_HOSPITAL_ID,
        name: 'Sharda Hospital',
      },
      doctorSnapshot: {
        doctorId: SHARDA_DOCTOR_ID,
        name: 'Dr. Ramesh Sharma',
        specialty: 'Cardiology',
      },
      patientSnapshot: {
        patientId: 'patient-test-001',
        name: 'Ravi Kumar',
        email: 'patient@example.com',
        phone: '+91-9876543210',
      },
      createdAt: '2026-09-19T09:00:00.000Z',
      updatedAt: '2026-09-19T10:00:00.000Z',
      acceptedAt: '2026-09-19T10:00:00.000Z',
    });
  }
}

export async function startServer(port = parseInt(env.PORT || '4000', 10)): Promise<http.Server> {
  await seedLocalDemoAppointments();
  const server = createLocalServer();
  return new Promise<http.Server>((resolve) => {
    server.listen(port, () => {
      console.log(`====================================================`);
      console.log(` SwasthyaSetu Local Mock Backend Server`);
      console.log(` Running at: http://localhost:${port}`);
      console.log(` Mock AWS:   USE_MOCK_AWS=${env.USE_MOCK_AWS}`);
      console.log(` Frontend:   http://localhost:3000`);
      console.log(`====================================================`);
      resolve(server);
    });
  });
}

// Auto-start when executed directly
const scriptPath = process.argv[1]?.replace(/\\/g, '/');
if (scriptPath && (scriptPath.endsWith('server.ts') || scriptPath.endsWith('server.js'))) {
  startServer().catch((err) => {
    console.error('Failed to start local server:', err);
    process.exit(1);
  });
}
