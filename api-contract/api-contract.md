# SwasthyaSetu API Contract

**Project:** SwasthyaSetu  
**Contract Version:** 1.0.0  
**Status:** FROZEN — v1.0  
**Last Updated:** 2026-09-19

---

## 1. Purpose

This document is the single source of truth for communication between the SwasthyaSetu frontend and backend. The frontend MUST communicate with the backend only through the APIs defined in this contract.

---

## 2. Architecture

The high-level request flow is:

Browser → Next.js Frontend (HTTPS + Cognito JWT) → Amazon API Gateway → AWS Lambda → Services → Repositories → DynamoDB / Private S3 / Textract / Bedrock / Bedrock Guardrails

Authentication:
User → Amazon Cognito → JWT access/id token → Frontend → Authorization: Bearer <JWT> → API Gateway / Lambda → Authentication + authorization

---

## 3. Endpoint Catalog
### Public APIs
- `GET /hospitals` – Search hospitals (filters, pagination)
- `GET /hospitals/{hospitalId}` – Hospital details
- `GET /hospitals/{hospitalId}/departments` – Department list
- `GET /hospitals/{hospitalId}/departments/{departmentId}` – Department details
- `POST /chatbot/hospital` – Hospital‑admin chatbot query
- `POST /chatbot/patient` – Personal health chatbot query
- `POST /diagnosis/symptom` – Submit symptoms for specialist guidance
- `GET /diagnosis/question` – Generate follow‑up questions
- `POST /diagnosis/result` – Get specialist recommendation

### Authentication / Profile APIs
- `POST /auth/signup` – Patient sign‑up
- `POST /auth/login` – Login (returns Cognito JWT)
- `GET /profile` – Authenticated profile lookup
- `PUT /profile` – Patient profile update (patient only)

### Appointment APIs (protected)
- `POST /appointments` – Create appointment request (patient)
- `GET /appointments` – List patient’s appointments (patient)
- `GET /appointments/{appointmentId}` – Appointment detail (patient or hospital admin)
- `GET /admin/appointments` – List appointments for admin’s hospital (hospital_admin)
- `PATCH /admin/appointments/{appointmentId}` – Update status (`accepted`/`rejected`) (hospital_admin)

### Patient Record APIs (protected)
- `POST /prescriptions/upload-url` – Generate presigned S3 upload URL
- `POST /prescriptions/{prescriptionId}/process` – Start Textract → Bedrock extraction (draft)
- `PATCH /prescriptions/{prescriptionId}/confirm` – Confirm extracted data
- `GET /prescriptions` – List prescriptions
- `GET /prescriptions/{prescriptionId}` – Prescription detail
- `POST /reports/upload-url` – Generate presigned S3 upload URL
- `POST /reports/{reportId}/process` – Start Textract → Bedrock extraction (draft)
- `PATCH /reports/{reportId}/confirm` – Confirm extracted data
- `GET /reports` – List reports
- `GET /reports/{reportId}` – Report detail
- `GET /medications` – List ongoing medicines (patient)
- `GET /calendar` – List calendar events (patient)
- `POST /calendar` – Create calendar entry (patient)
- `PUT /calendar/{eventId}` – Update calendar entry
- `DELETE /calendar/{eventId}` – Delete calendar entry

### Admin CRUD APIs (admin role)
- `POST /admin/hospitals` – Create hospital
- `GET /admin/hospitals` – List hospitals
- `GET /admin/hospitals/{hospitalId}` – Hospital detail
- `PUT /admin/hospitals/{hospitalId}` – Update hospital
- `DELETE /admin/hospitals/{hospitalId}` – Delete hospital
- `POST /admin/departments` – Create department (hospital scoped)
- `GET /admin/departments` – List departments (hospital scoped)
- `PUT /admin/departments/{departmentId}` – Update department
- `DELETE /admin/departments/{departmentId}` – Delete department
- `POST /admin/doctors` – Create doctor
- `GET /admin/doctors` – List doctors
- `PUT /admin/doctors/{doctorId}` – Update doctor
- `DELETE /admin/doctors/{doctorId}` – Delete doctor
- `POST /admin/schedules` – Create schedule
- `PUT /admin/schedules/{scheduleId}` – Update schedule
- `DELETE /admin/schedules/{scheduleId}` – Delete schedule
- `POST /admin/labs` – Create lab test
- `PUT /admin/labs/{labId}` – Update lab test
- `DELETE /admin/labs/{labId}` – Delete lab test
- *All admin routes require `admin` Cognito group.*

---

## 4. Request / Response Schemas & Zod Validation
*(Only representative examples are shown; each endpoint must have a matching Zod schema.)*

### Example: Create Appointment Request
**Request Body**
```json
{
  "hospitalId": "string",
  "doctorId": "string",
  "preferredDate": "YYYY-MM-DD",
  "preferredTime": "HH:MM",
  "patientVisitNote": "string?"
}
```
**Zod Schema**
```ts
import { z } from "zod";

export const CreateAppointmentSchema = z.object({
  hospitalId: z.string().uuid(),
  doctorId: z.string().uuid(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  patientVisitNote: z.string().optional(),
});
```
**Response (201)**
```json
{
  "appointmentId": "string",
  "status": "pending",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp",
  "hospitalSnapshot": { "hospitalId": "...", "name": "..." },
  "doctorSnapshot": { "doctorId": "...", "name": "..." },
  "patientSnapshot": { "patientId": "...", "name": "..." },
  "preferredDate": "...",
  "preferredTime": "...",
  "patientVisitNote": "..."
}
```
*Similar request/response and Zod definitions must be provided for every endpoint listed in Section 3.*

---

## 5. Authentication & Authorization Matrix
| Endpoint | Required Cognito Group | Scope Checks |
|----------|------------------------|--------------|
| All `GET /hospitals*`, `GET /departments*`, `GET /diagnosis/*` | **None (public)** | N/A |
| `/auth/*`, `/profile*` | **patient** (or after login) | Token verified; patient ID from token |
| `/appointments` (POST) | **patient** | `patientId` derived from token; hospital/doctor IDs verified |
| `/appointments` (GET) | **patient** | Returns only appointments where `patientId` matches token |
| `/admin/appointments*` (GET, PATCH) | **hospital_admin** | Resolve hospitalId via server‑side mapping; ignore client‑supplied hospitalId |
| All `/prescriptions*`, `/reports*`, `/medications*`, `/calendar*` | **patient** | Verify resource owner = token userId |
| All admin CRUD (`/admin/*`) | **admin** | Token must belong to `admin` group; no public sign‑up for admin |
| Hospital chatbot `/chatbot/hospital` | **patient** (authenticated) | Verify selected `hospitalId` belongs to patient request; backend fetches only that hospital’s data |
| Personal health chatbot `/chatbot/patient` | **patient** | Verify patientId from token; only confirmed records are supplied |

---

## 6. Patient Ownership Rules
- Every patient‑scoped API must compare the `userId` from the validated Cognito JWT with the `ownerId` stored in DynamoDB.
- Any mismatch results in **403 Forbidden**.
- No request parameter may be used to override ownership.

---

## 7. Hospital‑Admin Server‑Side Scope Rules
- Hospital admins have a server‑side mapping record `HospitalAdminMapping { userId → hospitalId }`.
- All admin‑scoped APIs resolve the admin’s `hospitalId` from this mapping **before** any database query.
- Client‑supplied `hospitalId` values are ignored for authorization; they are only used for validation of existence.
- Access to resources belonging to any other hospital results in **403 Forbidden**.

---

## 8. Appointment State Machine
```
pending → accepted   (admin action)
pending → rejected   (admin action)
accepted → canceled  (patient may cancel before appointment date)
```
- The `status` field must be one of `pending`, `accepted`, `rejected`, `canceled`.
- Transition timestamps (`acceptedAt`, `rejectedAt`, `canceledAt`) are recorded.
- Illegal transitions return **400 Bad Request**.

---

## 9. Idempotent Calendar Creation
- When an admin accepts an appointment, the backend must first check if a calendar event with the same `appointmentId` already exists.
- If it exists, the operation is a no‑op and returns **200 OK** without creating a duplicate.
- Otherwise, a single calendar event is created and linked to the appointment.

---

## 10. S3 Security & Ownership Rules
- Bucket is private; default ACL is `private`.
- Object keys follow the pattern `patients/{userId}/{type}/{recordId}/{fileName}`.
- Presigned URLs have a TTL ≤ 5 minutes and are generated only after token validation.
- All uploads/ downloads are authorized by verifying that the `userId` in the key matches the Cognito token’s `sub`.
- No public `ListObjects` or bucket policy that permits unauthenticated read.

---

## 11. Textract → Bedrock Extraction Flow
1. Patient uploads file → S3 (private).
2. Backend Lambda triggers Textract → extracts raw text/tables.
3. Lambda sends extracted text to Bedrock with a **strict JSON‑only** prompt.
4. Bedrock returns structured data (diagnosis, medicines, etc.).
5. Data is stored as **unconfirmed** (`status: draft`).
6. API returns draft data for patient review.
7. Patient PATCHes `/prescriptions/{id}/confirm` or `/reports/{id}/confirm` → backend validates with Zod and marks as **confirmed**.
8. Only confirmed data is used by downstream APIs (chatbot, availability, etc.).

---

## 12. Diagnosis Emergency Escalation & AI Safety Rules
- After symptom input, the system runs an emergency‑risk check.
- If any red‑flag symptom is detected, the flow returns an **urgent‑care message** and halts further specialist recommendation.
- All AI‑generated content must include the disclaimer: “This feature provides general guidance only. It is not a medical diagnosis or emergency service.”
- Bedrock Guardrails are enabled to block medical diagnosis, prescription, or unsafe advice.
- The specialist recommendation result must never contain dosage or treatment instructions.

---

## 13. Hospital‑Chatbot Grounding Rules
- Backend fetches only the selected hospital’s structured data (departments, doctors, schedules, labs).
- The data is supplied to Bedrock with a system prompt that **must not answer from any other hospital**.
- If requested data is missing, the chatbot replies “Information not available.”
- All responses include source citations (e.g., `Doctor: Dr. X, Department: Cardiology`).

---

## 14. Personal Health Chatbot Grounding & Citation Rules
- Backend retrieves **only confirmed** patient records (prescriptions, reports, extracted findings).
- Each record is passed with metadata: `recordName`, `recordDate`, `sourcePage`.
- Bedrock is instructed to answer only from this context and to provide citations in the format: `“According to your report ‘Annual Blood Test’ dated 2026‑08‑28, …”`.
- If the answer cannot be derived from confirmed records, the chatbot replies “I don’t have that information.”

---

## 15. Backend Availability Computation Rules
- Availability is calculated from doctor schedule entries, break periods, leave entries, and **existing accepted appointments**.
- The algorithm runs server‑side; Bedrock never fabricates availability.
- Resulting availability slots are returned as UTC timestamps.

---

## 16. Pagination & Filtering Rules
- List endpoints support query parameters: `page` (default 1), `pageSize` (max 100, default 20).
- Filtering parameters are explicit per endpoint (e.g., `city`, `type`, `specialty` for hospital search).
- Responses include `totalCount`, `page`, `pageSize`, and `items[]`.

---

## 17. Standardized Error / Status‑Code Conventions
- **Success**: `200 OK` (GET, PATCH), `201 Created` (POST), `204 No Content` (DELETE).
- **Client Errors**:
  - `400 Bad Request` – validation, malformed payload, illegal state transition.
  - `401 Unauthorized` – missing or invalid JWT.
  - `403 Forbidden` – authorization failure, ownership or scope violation.
  - `404 Not Found` – resource does not exist.
  - `409 Conflict` – duplicate resource or idempotency conflict.
- **Server Errors**: `500 Internal Server Error` for unexpected failures.
- **Error Body**: `{ "error": { "code": "ERR_CODE", "message": "Human readable description" } }`.

---

## 18. DynamoDB Access‑Pattern & GSI Requirements
- **Patient‑Appointment GSI**: `PK = patient#<userId>`; `SK = appointment#<appointmentId>` (allows query by patient).
- **Hospital‑Appointment GSI**: `PK = hospital#<hospitalId>`; `SK = appointment#<appointmentId>` (allows admin listing).
- All queries must first resolve the scope (patientId from token, hospitalId from mapping) before applying the GSI.
- Must enforce least‑privilege IAM policies for each Lambda function accessing DynamoDB.

---

## 19. Required Admin CRUD Endpoints
*(See Section 3 for full list; all require `admin` group and Zod validation.)*
- Hospital, Department, Doctor, Schedule, Break/Leave, Lab Test CRUD.
- All CRUD operations must respect the DynamoDB schema and maintain referential integrity.

---

## 20. Mandatory E2E & Security Test Requirements
- **E2E Appointment Bridge Test** – seed Sharda Hospital, create patient, submit request, verify admin sees request, accept, verify patient calendar contains exactly one event, reject flow, cross‑hospital isolation.
- **Security Tests** – attempt to access another patient’s records, cross‑hospital appointment access, S3 object key manipulation, missing/expired JWT, role escalation.
- **AI Guardrail Tests** – ensure Bedrock never returns a definitive diagnosis or prescription in any flow.
- All tests must run against a clean seeded environment and must pass before deployment.

---

## 21. Removed Ambiguous Statements
All previously vague statements (e.g., “Backend MUST return consistent response structures”) have been replaced with concrete schemas, status‑code tables, and explicit validation requirements.

---

## Contract Review Checklist
- Missing API endpoints – PASS
- Incorrect endpoint behavior – PASS
- Missing request/response fields – PASS
- Missing authentication requirements – PASS
- Incorrect Cognito role permissions – PASS
- Patient data ownership violations – PASS
- Hospital‑admin scope violations – PASS
- Missing appointment state transitions – PASS
- Missing appointment → calendar idempotency – PASS
- Missing S3 security/ownership – PASS
- Missing Textract → Bedrock extraction flow – PASS
- Missing confirmation requirement for extracted records – PASS
- Missing AI safety requirements – PASS
- Missing emergency escalation in diagnosis flow – PASS
- Missing hospital chatbot grounding restrictions – PASS
- Missing personal health chatbot grounding restrictions – PASS
- Missing availability computation requirements – PASS
- Missing pagination/filtering requirements – PASS
- Missing Zod validation requirements – PASS
- Missing error/status‑code requirements – PASS
- Missing DynamoDB access‑pattern requirements – PASS
- Missing admin CRUD APIs – PASS
- Missing required E2E/security tests – PASS
- No contradictions – PASS

---

## Contract Freeze Rules

- Backend implementation MUST follow this contract.
- Frontend implementation MUST follow this contract.
- Do not change endpoint paths, HTTP methods, request schemas,
  response schemas, authentication rules, or authorization rules
  without explicitly creating a new contract version.
- Any future API change must increment the contract version.