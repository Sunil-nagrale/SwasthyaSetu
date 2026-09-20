# SwasthyaSetu Backend

The backend for **SwasthyaSetu** is an AWS-native healthcare coordination service built with TypeScript, Amazon API Gateway, AWS Lambda, Amazon DynamoDB, Amazon S3, Amazon Textract, and Amazon Bedrock.

---

## 1. Prerequisites

- **Node.js**: v20.x or higher (tested on Node v22+)
- **npm**: v10.x or higher
- **TypeScript**: v5.x+ / v7.x (`tsc`)
- **AWS CLI** (optional for mock mode, required for real AWS deployment)

---

## 2. Local Setup & Verification

From the `backend` directory:

```bash
# 1. Install dependencies
npm install

# 2. Verify TypeScript types (zero errors)
npm run typecheck

# 3. Compile TypeScript to dist/
npm run build

# 4. Run full automated test suite (80 tests across 30 suites)
npm test

# 5. Run database seed script
npm run seed
```

---

## 3. Configuration & Environment Variables

All configuration is loaded via environment variables (defined in `backend/src/config/env.ts` with template in `backend/.env.example`).

> [!NOTE]
> Never hardcode or commit actual secrets, access keys, or production tokens into the codebase.

### Environment Variable Names

| Variable Name | Purpose / Mode |
|---|---|
| `NODE_ENV` | Application environment (`development`, `test`, `production`) |
| `PORT` | Local server port (default: `4000`) |
| `USE_MOCK_AWS` | `true` activates in-memory repositories and mock AWS services; `false` uses real AWS SDK clients |
| `AWS_REGION` | AWS region (e.g. `ap-south-1`) |
| `DYNAMODB_TABLE_NAME` | DynamoDB single-table name (e.g. `swasthyasetu-main-table`) |
| `S3_BUCKET_NAME` | Private S3 bucket for medical records (prescriptions & reports) |
| `COGNITO_USER_POOL_ID` | Amazon Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | Amazon Cognito App Client ID |
| `BEDROCK_MODEL_ID` | Foundation model ID for extraction, chatbots, and diagnosis guidance |
| `BEDROCK_GUARDRAIL_ID` | Optional Amazon Bedrock Guardrail identifier |
| `BEDROCK_GUARDRAIL_VERSION` | Optional Amazon Bedrock Guardrail version |

When `USE_MOCK_AWS=false`, placeholder or dummy values (e.g., strings containing `placeholder`, `dummy`) are rejected by `assertProductionAwsConfig` in `src/repositories/container.ts` to prevent accidental misconfiguration.

---

## 4. DynamoDB Single-Table Design

The backend uses a single-table architecture for all data domains.

- **Table Name**: Configured by `DYNAMODB_TABLE_NAME`
- **Primary Keys**:
  - `PK` (Partition Key, String)
  - `SK` (Sort Key, String)
- **Global Secondary Indexes**:
  - **GSI1**: `GSI1PK` (Partition Key, String), `GSI1SK` (Sort Key, String)
  - **GSI2**: `GSI2PK` (Partition Key, String), `GSI2SK` (Sort Key, String)

### Key Schema & Access Patterns Table

| Domain / Entity | PK | SK | GSI1PK / GSI1SK | GSI2PK / GSI2SK | Access Patterns / Description |
|---|---|---|---|---|---|
| **Hospital Metadata** | `HOSPITAL#<hospitalId>` | `METADATA` | `CITY#<city_lower>` / `HOSPITAL#<id>` | `TYPE#<type>` / `HOSPITAL#<id>` | Get hospital detail; search/filter by city and hospital type |
| **Department** | `HOSPITAL#<hospitalId>` | `DEPT#<departmentId>` | — | — | List all departments in hospital; get department details |
| **Doctor** | `HOSPITAL#<hospitalId>` | `DOCTOR#<doctorId>` | `SPECIALTY#<spec_lower>` / `DOCTOR#<id>` | — | List doctors in hospital; filter by department or specialty |
| **Doctor Schedule** | `HOSPITAL#<hospitalId>` | `SCHEDULE#<doctorId>#<schId>` | — | — | Fetch doctor weekly timetable for availability calculation |
| **Break / Leave** | `HOSPITAL#<hospitalId>` | `BREAK#<doctorId>#<blId>` | — | — | Doctor break times and leaves used to filter availability slots |
| **Lab Test** | `HOSPITAL#<hospitalId>` | `LAB#<labId>` | — | — | List hospital diagnostic services, prices, turnaround times |
| **Admin Mapping** | `USER#<userId>` | `HOSPITAL_ADMIN_MAPPING` | `hospital#<hospitalId>` / `admin#<userId>` | — | Server-side mapping of hospital-admin to hospital ID |
| **Patient Profile** | `USER#<userId>` | `PROFILE` | — | — | Get/update authenticated patient demographics and emergency contact |
| **Appointment** | `patient#<patientId>` | `appointment#<appointmentId>` | `hospital#<hospitalId>` / `appointment#<id>` | `doctor#<doctorId>#date#<date>` / `appointment#<id>` | Query patient appointments (PK); query hospital requests for admin (GSI1); check slot availability (GSI2) |
| **Appointment Lookup** | `APPOINTMENT#<appointmentId>` | `LOOKUP` | — | — | Global lookup index to locate appointment by ID without patientId |
| **Calendar Event** | `patient#<patientId>` | `calendar#<eventId>` | `appointment#<appointmentId>` / `calendar#<eventId>` | — | List patient calendar entries; sync accepted consultations |
| **Calendar Lookup** | `CALENDAR#<eventId>` | `LOOKUP` | — | — | Fast lookup to read/update/delete calendar events |
| **Appointment Cal Lookup** | `APPOINTMENT_CAL#<appointmentId>` | `EVENT` | — | — | **Idempotent Calendar Check**: ensures 1 calendar event per appointment |
| **Ongoing Medication** | `patient#<patientId>` | `medication#<medicineId>` | — | — | Active patient prescriptions; auto-synced upon confirmation |
| **Prescription** | `patient#<patientId>` | `prescription#<prescriptionId>` | — | — | S3 document metadata, Textract OCR raw text, extracted medicines |
| **Prescription Lookup**| `PRESCRIPTION#<prescriptionId>` | `LOOKUP` | — | — | Global lookup for prescription by ID (ownership verified) |
| **Medical Report** | `patient#<patientId>` | `report#<reportId>` | — | — | S3 report metadata, Textract OCR text, structured findings |
| **Report Lookup** | `REPORT#<reportId>` | `LOOKUP` | — | — | Global lookup for medical report by ID (ownership verified) |
| **Diagnosis Session** | `SESSION#<sessionId>` | `METADATA` | — | — | Persisted symptom evaluation, emergency flag, and follow-up tracking |

---

## 5. Seed Script Instructions

The database seed script idempotently populates hospitals, departments, doctors, schedules, breaks/leaves, laboratory tests, hospital-admin mappings, and sample patient profiles.

```bash
npm run seed
```

- When `USE_MOCK_AWS=true` (default in development), seeds in-memory repositories.
- When `USE_MOCK_AWS=false`, connects to the DynamoDB single-table configured by `DYNAMODB_TABLE_NAME`.
- The operation is **strictly idempotent**: running `npm run seed` multiple times overwrites items by predictable primary keys and does not create duplicate entries.
- Logging output never reveals secrets or environment values.

---

## 6. Amazon Cognito Hospital-Admin Setup & Mapping Flow

In production, user authentication is managed by Amazon Cognito User Pools, and authorization scopes are strictly enforced server-side:

### Step 1: Create the User in Cognito
Create the hospital administrator user in your Cognito User Pool:
- User Pool: `${COGNITO_USER_POOL_ID}`
- Set email and verified status.
- Note the resulting `sub` (User ID, e.g. `admin-sharda-001` in demo/seed).

### Step 2: Assign to the `hospital_admin` Cognito Group
In Cognito User Pool Groups:
- Create the group `hospital_admin` if not already present.
- Add the user to the `hospital_admin` group.
- The Cognito JWT authorizer will include `cognito:groups: ["hospital_admin"]` in token claims.

### Step 3: Map Admin to Hospital in DynamoDB
To ensure strict cross-hospital isolation (Contract Section 7), hospital admins cannot supply their own `hospitalId`. The backend ignores any client-supplied hospital ID and resolves the assigned hospital from DynamoDB:
- Item PK: `USER#<userId>`
- Item SK: `HOSPITAL_ADMIN_MAPPING`
- Attribute: `hospitalId: "11111111-1111-1111-1111-111111111111"` (Sharda Hospital)
- Attribute: `hospitalName: "Sharda Hospital"`

> [!TIP]
> The seed script (`npm run seed`) automatically inserts the test mapping for `admin-sharda-001` (mapped to Sharda Hospital) and `admin-max-002` (mapped to Max Super Speciality Hospital).

---

## 7. Mandatory Appointment Bridge Verification Flow

The E2E appointment lifecycle connects patients to hospital administrators with cross-hospital isolation and calendar synchronization.

### Workflow:
1. **Patient Appointment Request**:
   - Patient calls `POST /appointments` with `hospitalId`, `doctorId`, `preferredDate`, and `preferredTime`.
   - Backend calculates doctor availability (`computeDoctorAvailability`), checking working days, hours, slot intervals, breaks, and existing accepted bookings.
   - Saves appointment in `pending` status with immutable snapshots of hospital and doctor names.
2. **Hospital Admin Isolation**:
   - Hospital admin calls `GET /admin/appointments`.
   - Backend resolves `auth.hospitalId` via server-side mapping (`resolveHospitalAdminScope`).
   - Sharda Hospital admin sees only Sharda Hospital appointments; Max Hospital admin cannot see or accept them (cross-hospital access returns `403 Forbidden`).
3. **Admin Accept / Reject**:
   - Admin calls `PATCH /admin/appointments/{appointmentId}` with `{"status": "accepted"}`.
   - Status updates from `pending` to `accepted`. Illegal transitions (e.g. `accepted` to `rejected`) return `400 Bad Request`.
4. **Idempotent Calendar Synchronization**:
   - Upon acceptance, backend checks `calendarRepo.findEventByAppointmentId`.
   - If no event exists, creates exactly one patient calendar event (`type: appointment`).
   - If acceptance is retried, the operation returns `200 OK` as a no-op without creating duplicate calendar entries.
5. **Patient View**:
   - Patient calls `GET /calendar` and sees the consultation entry.

---

## 8. Test Baseline

Verified test suite status:
- `npm run typecheck`: Passed (0 errors)
- `npm run build`: Passed (0 errors)
- `npm test`: **80 tests passed across 30 test suites, 0 failures**
  - AI Workflows & Emergency Escalation: Passed
  - Appointment Lifecycle & Availability Computation: Passed
  - Authentication & Scope Enforcement: Passed
  - Repository Composition Root: Passed
  - Prescriptions & Reports OCR Extraction Flow: Passed
  - Database Seed Script Idempotency & Data Integrity: Passed
  - Zod Validation Schemas (Strict Contract Adherence): Passed
  - Standardized Error Handling: Passed
  - Structured Logger & Medical PII Redaction: Passed
  - Health Check: Passed
  - Public Hospital APIs: Passed
  - Lambda Router Dispatcher: Passed
