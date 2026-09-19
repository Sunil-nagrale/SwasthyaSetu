# Build SwasthyaSetu — full implementation specification

Build a complete, production-style hackathon web application named **SwasthyaSetu**.

SwasthyaSetu is an AWS-powered healthcare coordination platform connecting patients, hospitals, and doctors. It helps people find hospitals and specialists, request appointments, store and understand medical records, and receive hospital-specific information. It also gives hospital administrators a secure portal to manage their hospital data and appointment requests.

This is a strict specification. Implement all requirements below and do not add unrelated features.

## Mandatory working approach

Before writing implementation code:

1. Inspect the repository and create `implementation_plan.md`.
2. State the architecture, route map, DynamoDB design, AWS resource plan, security model, appointment lifecycle, and test plan in that file.
3. Build in logical phases.
4. Run linting, TypeScript checks, tests, and a production build before declaring completion.
5. Fix all discovered errors.
6. Update the README with accurate setup and deployment instructions.

Do not stop after creating a UI. The application must include the real AWS-backed architecture, protected APIs, data layer, CDK infrastructure, seed data, and complete appointment bridge between patient and hospital administrator.

---

# 1. Strict scope

## Build only these features

- Public hospital search and discovery
- Hospital profiles with department, doctor, laboratory, and enquiry information
- AI-assisted symptom-to-specialist guidance
- Patient authentication and dashboard
- Prescription upload, analysis, review, and storage
- Report upload, analysis, review, and storage
- Patient-specific health chatbot with citations
- Ongoing medication view
- Patient calendar
- Hospital-admin management portal
- Appointment requests from patient to hospital admin
- AWS deployment infrastructure and seed data

## Do not add any of these features

Do not implement:

- Payments
- Video consultations
- ABHA integration
- SMS or WhatsApp notifications
- Reviews or ratings
- Social/community features
- Insurance
- Ambulance booking
- Pharmacy ordering
- Doctor-to-doctor communication
- Unrelated dashboards
- Generic wellness blogs
- Public medical forums
- Automatic appointment confirmation without hospital-admin approval

---

# 2. Required technology stack

Use these technologies throughout the project.

## Frontend

- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Responsive desktop and mobile layouts

## Backend

- TypeScript AWS Lambda functions behind Amazon API Gateway
- Keep frontend UI code separate from backend service/repository code.
- Do not place raw DynamoDB calls directly in React components.
- Use reusable API client, service, and repository modules.

## AWS

- AWS Amplify Hosting for the Next.js frontend
- Amazon Cognito for authentication and role groups
- Amazon DynamoDB for application data
- Private Amazon S3 bucket for prescriptions and reports
- Amazon Textract for OCR/document extraction
- Amazon Bedrock for AI workflows
- Amazon Bedrock Guardrails for safe AI behavior
- API Gateway and Lambda for backend APIs
- Amazon CloudWatch for logs
- AWS CDK with TypeScript for all infrastructure

## Configuration

- Use environment variables for every AWS resource identifier, URL, region, and secret.
- Never hardcode AWS credentials.
- Provide a complete `.env.example`.
- Use only safe local placeholder images or local seed images.
- Do not depend on public hospital data APIs for core functionality.

---

# 3. Product principles and safety rules

SwasthyaSetu is a healthcare navigation and record-understanding product. It is not a replacement for a doctor.

Apply these rules consistently:

- The symptom flow is called “Get Diagnosed” on the home-page CTA as required, but the feature must clearly explain that it helps the user **find the right specialist** and does not provide a medical diagnosis.
- Show a visible disclaimer in all AI symptom and record-analysis screens:
  - “This feature provides general guidance only. It is not a medical diagnosis or emergency service.”
- Add emergency escalation before normal symptom recommendations. If symptoms indicate an emergency, show an urgent message instructing the user to seek immediate emergency care and do not present normal specialist results as a substitute.
- AI must never prescribe medication, provide a definitive diagnosis, guarantee availability, or invent medical/hospital data.
- Prescription/report extraction is always a draft until the patient manually reviews and confirms it.
- Hospital enquiry answers must use only current, structured hospital data from DynamoDB.
- Personal health chatbot answers must use only confirmed records belonging to the currently logged-in patient.
- Every personal health chatbot answer must include citations to record name, date, and page when available.
- Doctor availability must be calculated from schedules, working hours, breaks, leaves, and appointment status—not invented by Bedrock.
- Display “Last updated” metadata for live hospital schedule/pricing information where practical.
- Never make S3 medical documents public.

---

# 4. User roles and authorization

Create these Cognito groups:

1. `patient`
2. `hospital_admin`
3. `admin`

## Patient role

A patient can access only:

- Their own profile
- Their own prescriptions
- Their own reports
- Their own confirmed record findings
- Their own medication list
- Their own calendar entries
- Their own appointment requests
- Their own personal health chatbot context

A patient must never access another patient’s files, records, appointments, or chat context.

## Hospital admin role

A hospital admin can access only data belonging to their assigned hospital:

- Hospital profile
- Departments
- Department facilities
- Doctors
- Doctor schedules
- Doctor breaks and leave status
- Laboratory tests and prices
- Incoming appointment requests for that hospital

A hospital admin must never see another hospital’s appointment requests or management data.

## Admin role

The `admin` role is for authorized platform setup/management only. Do not make public sign-up capable of choosing `admin` or `hospital_admin`.

## Required hospital-admin mapping

Cognito group membership alone is not enough. Create a server-side profile/mapping record that links each hospital administrator to exactly one hospital:

```
userId -> role: hospital_admin -> hospitalId
```

Use the authenticated Cognito user ID and this server-side mapping for every hospital-admin API request. Never trust a `hospitalId` supplied by the browser for access control.

---

# 5. Design system and visual direction

Build a modern, trustworthy, calm, healthcare-focused interface.

## Visual language

- Calm blue and white palette
- Light neutral backgrounds
- Clear dark text with accessible contrast
- Soft rounded cards and restrained shadows
- Clean data-heavy layouts without clutter
- Consistent icons from the chosen UI/icon system
- Clear loading, empty, error, success, and confirmation states
- Accessible labels, keyboard-friendly dialogs, and usable focus states
- Mobile-first responsiveness

## Desktop layout

- Comfortable page width with consistent horizontal spacing
- Header/navigation that remains simple and focused
- Home page uses a large main content area and a right-side diagnosis panel approximately one-third of desktop width
- Hospital detail page uses a two-column desktop section:
  - Left: department discovery
  - Right: laboratory and enquiry tools
- Dashboard uses a sidebar on desktop
- Dashboard uses a compact mobile navigation pattern on small screens

## Mobile layout

- Stack the home search content and diagnosis panel
- Convert multi-column layouts into clear vertical sections
- Keep all upload, calendar, appointment, and management actions reachable without horizontal scrolling
- Use drawers/modals appropriately for department, doctor, and lab details

---

# 6. Public routes and pages

Implement these routes.

## `/` — Public home page

Build the landing page with these exact elements:

### Hero content

Top-left hero text:

> “Save and analyze all your records at a single place”

Include a prominent **Get Started** button that navigates to `/auth`.

### Hospital search area

Include:

- Large hospital search bar
- Search by:
  - Hospital name
  - Department/specialty
  - City
  - Location/locality
- Filter controls for:
  - Government hospital / private hospital
  - City
  - Location

Below the search bar, show a **Popular Hospitals** section using seeded hospital cards.

### Right-side diagnosis panel

On desktop, place a panel occupying roughly one-third of the page.

It must include:

- Heading: **Get Diagnosed**
- Brief description
- A clear disclaimer that this is guidance, not diagnosis/emergency care
- Button navigating to `/get-diagnosed`

On mobile, stack this panel naturally below or after the primary search experience.

---

## `/hospitals` — Search results

Implement a hospital directory/results page.

### Requirements

- Read search and filter values from URL query parameters.
- Display hospital cards with:
  - Hospital image
  - Hospital name
  - Government/private type
  - City
  - Location
  - Available specialties
  - Button to view hospital details
- Allow filtering by:
  - Hospital type
  - City
  - Location
- Support search by:
  - Hospital name
  - Department/specialty
  - City
  - Location
- Include proper empty state when no hospitals match.
- Populate using realistic but clearly demo-only seeded data for one Indian city.
- Seed at least 10 hospitals, including both government and private hospitals.
- Include a demo hospital named **Sharda Hospital** so appointment handoff can be demonstrated end-to-end.

---

## `/hospitals/[hospitalId]` — Hospital details

At the top, show:

- Hospital image
- Hospital name
- Hospital type: government or private
- Address/location
- Hospital description
- Google Maps redirect link

Use a valid generated Google Maps search/directions link based on the hospital address. Do not build an embedded-map feature.

### Department section: left side on desktop

Render department cards for specialties such as:

- Gynaecology
- Gastroenterology
- Dentistry
- Cardiology
- Orthopaedics
- Other seeded specialties

When the user selects a department, open an accessible modal or drawer showing:

- Department name
- Department facilities
- Doctors in that department
- Doctor qualifications
- Doctor consultation fees
- Doctor timings
- Current calculated availability
- Facilities such as surgery, transplant, ICU, diagnostics, etc., when provided in data

### Laboratory section: right side on desktop

Show a laboratory block.

When selected, open an accessible modal or drawer listing:

- Test name
- Test price
- Preparation instructions, when available
- Report turnaround time, when available

### Hospital enquiry chatbot

Include an enquiry chatbot tied only to the currently viewed hospital.

The chatbot must answer only from structured data for that hospital:

- Doctor timings
- Working hours
- Breaks
- Current doctor availability status
- Lab test prices
- Department facilities

Required behavior:

- The backend retrieves current hospital data from DynamoDB.
- The backend calculates availability based on schedules, breaks, leave entries, and active state.
- The backend sends only relevant selected hospital data to Bedrock.
- Bedrock must be instructed to answer only from that supplied data.
- If data is missing, the answer must say it is unavailable.
- The chatbot must not invent a price, doctor, department, timing, or availability.
- Never let the chatbot access data belonging to another hospital.
- Display relevant source details in the response, such as doctor name, schedule, lab test, or facility.

Also include an **Ask for appointment** action beside eligible doctors or in the appointment area.

---

## `/get-diagnosed` — Symptom-to-specialist guidance

This is an AI-assisted specialist recommendation flow, not a medical diagnosis system.

### Step 1: symptom input

Show:

- Clear title such as “Find the right specialist”
- Textarea asking the user to describe symptoms
- Visible medical disclaimer
- Continue button

### Step 2: emergency safety gate

Before normal follow-up questions or doctor results, evaluate symptoms for emergency red flags.

Examples include severe chest pain, severe difficulty breathing, signs of stroke, unconsciousness, severe bleeding, suicidal intent, or other urgent warning signs.

If an emergency is indicated:

- Show a high-visibility urgent-care message.
- State that SwasthyaSetu is not an emergency service.
- Do not present a normal specialist recommendation as a substitute for urgent care.
- Allow the user to leave the flow or view hospitals, but do not falsely reassure them.

### Step 3: adaptive generic follow-up questions

Use Amazon Bedrock to generate generic follow-up multiple-choice questions from the symptom description.

Questions should cover, when relevant:

- Duration: days, weeks, months, years
- Frequency/constancy
- Severity
- Associated symptoms
- Relevant generic context such as recent injury, fever, pregnancy, or existing condition

Requirements:

- Ask questions one at a time or in a short, accessible multi-step flow.
- Use predefined answer options where possible.
- Do not ask for unnecessary sensitive data.
- Keep the flow concise and easy to complete.

### Step 4: specialist guidance result

After answers are submitted, use Bedrock to return:

- Recommended doctor specialty
- Short, plain-language explanation
- Concise “what to tell the doctor” summary

Example style:

> “Consider visiting a gastroenterologist and mention that you have experienced heartburn for two weeks.”

Also show:

- The visible guidance-only disclaimer
- Emergency escalation advice where appropriate
- No definitive diagnosis
- No medication instructions

### Step 5: real matching doctors and hospitals

Below the guidance, query DynamoDB and show real matching results based on:

- Recommended specialty
- City/location
- Doctor consultation fee
- Doctor qualification
- Current doctor availability

Each result must show:

- Hospital name
- Doctor name
- Specialty
- Qualification
- Consultation fee
- Availability status
- Hospital/location
- **Ask for appointment** button

These doctor/hospital cards must come from DynamoDB, not generated by Bedrock.

---

## `/auth` — Authentication

Create sign-up and login screens.

### Patient sign-up fields

- Full name
- Email
- Password
- Date of birth

Store date of birth in user profile data linked to the Cognito user ID. Store a patient profile record in DynamoDB after successful registration/confirmation.

### Login behavior

After login:

- `patient` → `/dashboard`
- `hospital_admin` → `/hospital-admin`
- `admin` → appropriate restricted admin destination or setup route if required by the implementation

Include:

- Secure session handling
- Logout
- Clear validation errors
- Password and auth error feedback
- No public ability to sign up as a hospital admin or platform admin

---

# 7. Patient dashboard

Create `/dashboard` with desktop sidebar navigation and mobile-appropriate navigation.

The dashboard must contain exactly these five primary areas:

1. Prescriptions
2. Reports
3. Personal health chatbot
4. Current ongoing medications
5. Calendar

Do not add unrelated dashboard modules.

---

## `/dashboard/prescriptions`

### Upload flow

Allow a patient to upload:

- PDF
- JPG
- JPEG
- PNG

The patient must provide:

- Custom prescription name
- Prescription date

### Secure file flow

1. Frontend requests a short-lived presigned upload URL from the protected API.
2. API derives user ID from authenticated Cognito token.
3. API creates the correct private S3 key:
   - `patients/{userId}/prescriptions/...`
4. Frontend uploads directly to S3 using the presigned URL.
5. Frontend calls protected processing endpoint after successful upload.
6. Backend starts document analysis workflow.

Validate:

- Allowed MIME/file types
- Safe file-size limit
- Authenticated ownership
- S3 object key belongs to the current patient

### Processing flow

1. Textract extracts text and structured elements where possible.
2. Send extracted text to Bedrock with a strict JSON-only extraction prompt.
3. Bedrock proposes:
   - Diagnosis
   - Medicines
   - Dosage/frequency, if legible
   - Purpose/use case, if present/legible
4. Save this result as **unconfirmed** extracted data.
5. Show a review screen where the patient can edit, remove, or confirm every extracted item.
6. Save only confirmed data as final patient record data.

### Prescription listing and detail

- Display stored prescription blocks in a sidebar/list.
- Support statuses:
  - Ongoing
  - Cured
- Ongoing prescriptions appear first.
- Cured prescriptions are visibly decoloured and displayed below ongoing prescriptions.
- On selecting a prescription, show:
  - Short-lived secure preview/download access to original image/PDF
  - Prescription name
  - Date
  - Confirmed diagnosis
  - Confirmed medicines
  - Status

---

## `/dashboard/reports`

### Upload flow

Allow a patient to upload:

- PDF
- JPG
- JPEG
- PNG

The patient must provide:

- Custom report name
- Report date

Store private files in:

```
patients/{userId}/reports/...
```

Use the same presigned upload, validation, ownership, and short-lived download process as prescriptions.

### Processing flow

1. Textract extracts text, tables, and relevant document structure.
2. Send extracted data to Bedrock through a strict structured extraction prompt.
3. Extract:
   - Report findings
   - Test names
   - Values
   - Units
   - Status exactly as indicated by report context, such as normal, high sugar, low haemoglobin, etc.
4. Save findings as unconfirmed.
5. Allow patient review/edit/confirmation.
6. Save final confirmed findings only after patient confirmation.

### Report listing and detail

- Display report blocks in a list.
- On selecting a report, show:
  - Original uploaded file through a short-lived private access URL
  - Report name
  - Date
  - Final confirmed report result
  - Confirmed extracted findings
  - Source page reference where available

---

## `/dashboard/assistant` — Personal health chatbot

Create a personal chatbot that can answer questions based only on the logged-in patient’s confirmed prescription and report records.

Example supported questions:

- “Tell me my current blood profile.”
- “What medicines am I currently taking?”
- “What did my recent report say?”

### Required safety and retrieval behavior

1. Authenticate the user.
2. Derive `userId` from verified Cognito token.
3. Retrieve only that patient’s confirmed prescriptions, reports, medicines, and findings.
4. Supply Bedrock only the relevant confirmed source records.
5. Include record title, date, page where available, and source data in the model context.
6. Instruct Bedrock:
   - Answer only from provided records.
   - Do not diagnose.
   - Do not prescribe.
   - State when the data does not contain an answer.
   - Return citations for factual claims.
7. Render citations under the response.

Required citation format includes:

- Record name
- Record date
- Source page when available

Example:

> “According to your report ‘Annual Blood Test’ dated 28 August 2026, your blood profile was recorded as normal.”

The patient must never be able to retrieve another user’s records through prompt manipulation or API parameters.

---

## `/dashboard/medications`

Show medicines extracted and confirmed from prescriptions whose status is `ongoing`.

Each medication card must include:

- Medicine name
- Dosage/frequency when available
- Current use case/purpose when extracted or confirmed
- Linked prescription
- Prescription date

Behavior:

- If a prescription changes to `cured`, medicines from that prescription must no longer appear in the ongoing medication list.
- Do not invent a medicine purpose. Show unavailable/unspecified when the confirmed record does not contain it.

---

## `/dashboard/calendar`

Create a monthly calendar view.

Patients can manually create:

- Previous doctor visits
- Upcoming visits

Patients can:

- View calendar entries
- Edit their own entries
- Delete their own entries

When selecting an entry, show its details.

Accepted appointment requests must automatically appear as upcoming visits.

---

# 8. Hospital-admin dashboard

Create `/hospital-admin`.

A hospital admin must see and manage only their assigned hospital.

Include these sections:

- Hospital profile editor
- Department management
- Department facility management
- Doctor management
- Doctor schedule management
- Doctor break management
- Doctor leave/availability management
- Laboratory test and price management
- Incoming appointment-request management

## Hospital profile management

Allow updating:

- Hospital name if appropriate for seeded/demo data constraints
- Hospital description
- Address/location
- Hospital type where permitted
- Image reference
- Google Maps redirect link data
- Working hours

## Department management

Allow hospital admin to:

- Create/update/delete departments for their own hospital
- Manage department facilities
- Associate doctors with departments

## Doctor management

Allow hospital admin to:

- Create/update/delete doctors for their own hospital
- Set doctor specialty/department
- Set qualification
- Set consultation fee
- Set active/inactive state

## Doctor schedule and availability management

Allow hospital admin to manage:

- Working days
- Start/end timings
- Break/lunch periods
- Leave days/ranges
- Availability status where appropriate

These updates must immediately affect:

- Hospital details page
- Doctor result cards
- Hospital enquiry chatbot
- Appointment eligibility/display

## Laboratory management

Allow hospital admin to manage:

- Lab test name
- Price
- Preparation instructions
- Report turnaround time

These updates must immediately affect the hospital details laboratory section and hospital enquiry chatbot.

---

# 9. Mandatory appointment-request bridge

This feature is critical. Implement it fully and verify it end-to-end.

## Product behavior

A logged-in patient must be able to choose a doctor at a hospital—such as **Sharda Hospital**—and submit an appointment request.

When the administrator assigned to Sharda Hospital logs in through `/hospital-admin`, that exact request must appear in the Sharda Hospital appointment enquiry list.

The request must never appear in another hospital admin’s dashboard.

When the Sharda Hospital admin accepts the request:

- The appointment status becomes `accepted`.
- The patient can see the accepted appointment in their calendar.
- The patient can see the updated request status in their appointment/calendar experience.

When the admin rejects it:

- Status becomes `rejected`.
- The patient sees the rejected status.
- Do not create an upcoming calendar visit.

## Appointment request form

When a patient selects **Ask for appointment**, require:

- Selected hospital
- Selected doctor or selected specialty when a specific doctor is not selected
- Preferred date
- Preferred time or time window
- Optional patient visit note

Use patient profile name from authenticated user data, not from arbitrary client-supplied identity data.

If the visitor is not logged in:

- Redirect to `/auth`.
- Preserve the intended appointment destination if practical.
- After login, return them to the relevant request flow.

## Appointment creation security and data rules

The appointment creation API must:

1. Verify Cognito token.
2. Verify the caller belongs to `patient` group.
3. Derive `patientId` from token, never request body.
4. Validate request body with Zod.
5. Verify selected hospital exists.
6. Verify selected doctor belongs to selected hospital.
7. Verify doctor is active and matches selected specialty if provided.
8. Save an appointment request with `pending` status.
9. Save immutable creation timestamp and update timestamp.
10. Return the created request safely to the patient.

Minimum appointment data:

```
appointmentId
hospitalId
hospitalName snapshot
doctorId
doctorName snapshot
specialty snapshot
patientId
patientName snapshot
preferredDate
preferredTime
patientVisitNote
status: pending | accepted | rejected
createdAt
updatedAt
acceptedAt or rejectedAt when applicable
```

Snapshots preserve meaningful historical display even if a doctor/hospital label later changes.

## Hospital-admin appointment access rules

Hospital-admin appointment listing API must:

1. Verify Cognito token.
2. Verify caller belongs to `hospital_admin` group.
3. Resolve the caller’s assigned `hospitalId` through server-side user-to-hospital mapping.
4. Query appointments only for that resolved hospital ID.
5. Ignore any browser-supplied hospital ID used to attempt cross-hospital access.
6. Return patient name, requested doctor, preferred date/time, visit note, and status for that hospital only.

Hospital-admin appointment update API must:

1. Verify hospital-admin role.
2. Resolve caller’s assigned hospital ID server side.
3. Fetch appointment by ID.
4. Confirm appointment `hospitalId` matches assigned admin hospital ID.
5. Allow only valid status transitions:
   - `pending` → `accepted`
   - `pending` → `rejected`
6. Prevent a second hospital or unauthorized user from changing the request.
7. Update timestamps.

## Accepted appointment calendar behavior

When a hospital admin accepts a pending appointment:

1. Update appointment status to `accepted`.
2. Create a patient calendar event linked to `appointmentId`.
3. Make this operation idempotent: accepting the same request repeatedly must not create duplicate calendar entries.
4. Calendar event includes:
   - Appointment date/time
   - Hospital
   - Doctor
   - Specialty
   - Visit note where appropriate
   - Link/reference to appointment request
5. The patient calendar shows it as an upcoming appointment.

If rejection occurs:

- Update appointment status to `rejected`.
- Do not create a calendar entry.

## Mandatory end-to-end test scenario

Implement tests and/or a documented seed/demo verification flow proving this exact journey:

1. Seed Sharda Hospital.
2. Create or configure a hospital-admin account mapped to Sharda Hospital.
3. Log in as a patient.
4. Open Sharda Hospital or a Sharda Hospital doctor result.
5. Submit appointment request for a Sharda Hospital doctor.
6. Confirm patient sees the request with `pending` status.
7. Log out.
8. Log in as Sharda Hospital hospital admin.
9. Confirm the same request appears in the Sharda Hospital incoming appointment list.
10. Confirm it does not appear for a different hospital admin.
11. Accept it.
12. Log back in as the patient.
13. Confirm status is `accepted` and calendar contains exactly one linked upcoming visit.

This workflow is mandatory. Do not consider the project complete unless it works.

---

# 10. DynamoDB design

Use a clear multi-table or single-table DynamoDB design. Prefer a design that makes authorization and appointment queries reliable and understandable.

Document the selected design in:

```
docs/dynamodb-schema.md
```

Use TypeScript repository/service modules for access.

Support at minimum these entities:

- Users
- Hospital-admin mappings
- Hospitals
- Departments
- Doctors
- Doctor schedules
- Doctor breaks/leaves
- Department facilities
- Lab tests
- Appointment requests
- Prescriptions
- Reports
- Extracted record findings
- Medicines
- Calendar events
- Chat history if necessary for conversational context

Required query/index support:

- Hospital search by city
- Hospital search by type
- Doctor search by specialty
- Patient appointment lookup
- Hospital appointment lookup
- Patient prescription lookup
- Patient report lookup
- Patient calendar lookup

## Appointment indexes

Ensure efficient, reliable lookup for both:

```
patientId -> appointment requests
hospitalId -> incoming appointment requests
```

Recommended status-aware queries may include status in sort keys or filtering where appropriate, but never compromise authorization. The server must always resolve current user/hospital scope before querying.

## Suggested authorization model

Use these server-side scope values:

```
patient scope = authenticated Cognito user ID
hospital-admin scope = authenticated Cognito user ID -> server-resolved assigned hospital ID
```

Do not use frontend route parameters or request-body hospital IDs as authorization proof.

---

# 11. S3 document handling

Create a private S3 bucket for medical files.

## Object organization

```
patients/{userId}/prescriptions/{prescriptionId}/{fileName}
patients/{userId}/reports/{reportId}/{fileName}
```

## Requirements

- All files remain private.
- Use short-lived presigned upload URLs.
- Use short-lived presigned download/view URLs.
- Validate PDF, JPG, JPEG, and PNG only.
- Validate maximum permitted file size.
- Validate ownership based on authenticated user ID.
- Do not return broad S3 listing access to browser users.
- Do not expose S3 credentials to the browser.
- Protect against cross-user object-key access.

---

# 12. Textract and Bedrock workflows

Keep AI prompts in dedicated backend files, for example:

```
src/lib/ai/prompts/
```

Use structured JSON schemas and validate model outputs before storage.

## Prescription processing workflow

1. Patient uploads a file to private S3.
2. Backend starts Textract analysis.
3. Extract text and tables/forms where possible.
4. Pass extracted text to Bedrock with a strict JSON-only prompt.
5. Request:
   - Diagnosis
   - Medicines
   - Dosage
   - Frequency
   - Purpose/use case when present
6. Parse and validate output.
7. Save as unconfirmed extracted data.
8. Return draft data for patient review.
9. Save final data only after patient confirms/edits it.

## Report processing workflow

1. Patient uploads a file to private S3.
2. Backend starts Textract analysis.
3. Extract text/tables and source pages where available.
4. Pass extracted content to Bedrock with strict structured prompt.
5. Request:
   - Report findings
   - Test names
   - Values
   - Units
   - Result status as written in report context
6. Parse and validate output.
7. Save unconfirmed findings.
8. Let patient review/edit.
9. Save confirmed final data.

## Hospital chatbot workflow

1. Verify selected hospital ID exists.
2. Fetch current hospital, department, doctor, schedule, break, leave, facility, and laboratory data only for that hospital.
3. Calculate availability from current schedule data.
4. Supply only this structured data to Bedrock.
5. Require Bedrock to answer only from supplied data.
6. If data does not exist, answer that it is not available.
7. Return source-grounded response.

## Personal health chatbot workflow

1. Authenticate patient.
2. Retrieve only confirmed records owned by that patient.
3. Include record title, date, source page, and confirmed facts in Bedrock context.
4. Require grounded response with citations.
5. Reject/redirect prompts seeking diagnosis, prescriptions, or data outside the supplied records.
6. Do not expose other patients’ data in prompts, logs, or responses.

## Bedrock Guardrails

Configure guardrails for:

- Unsafe/harmful output filtering
- Prompt-injection resistance
- Sensitive-information handling
- Blocking medical diagnosis/prescription behavior where prompt rules require it
- Grounded/limited responses for record and hospital chat use cases

---

# 13. API requirements

Create protected API Gateway + Lambda endpoints for the following capabilities.

All request bodies must be validated using Zod. All protected routes must verify Cognito authentication and role authorization server side.

## Public APIs

- Hospital search
- Hospital details
- Department details
- Hospital chatbot
- Symptom follow-up question generation
- Specialist recommendation results

## Authentication/profile APIs

- Authenticated profile lookup
- Patient profile creation/update where permitted

## Appointment APIs

- Create appointment request
- Patient appointment listing
- Hospital appointment listing
- Hospital appointment status update
- Appointment detail lookup with ownership/authorization check

## Patient record APIs

- Prescription upload URL generation
- Prescription analysis start/status/result
- Prescription confirmation/update
- Prescription listing/detail
- Report upload URL generation
- Report analysis start/status/result
- Report confirmation/update
- Report listing/detail
- Patient health chatbot
- Medication listing
- Calendar create/read/update/delete

## Hospital-admin APIs

- Hospital profile CRUD
- Department CRUD
- Department facility CRUD
- Doctor CRUD
- Schedule CRUD
- Break/leave availability CRUD
- Lab test CRUD
- Hospital appointment request management

Use consistent success/error response shapes and meaningful HTTP status codes.

---

# 14. AWS CDK infrastructure

Create an `infra/` folder containing AWS CDK TypeScript infrastructure.

Provision:

- Cognito user pool
- Cognito user groups:
  - `patient`
  - `hospital_admin`
  - `admin`
- DynamoDB tables and required GSIs
- Private S3 medical-file bucket
- API Gateway
- Lambda functions
- Least-privilege IAM roles and policies
- Textract permissions
- Bedrock permissions
- CloudWatch logs
- Amplify-compatible environment variable outputs

## IAM rules

Apply least privilege.

Examples:

- Patient file APIs access only required patient-key operations through backend authorization.
- Textract processing Lambda can read required private S3 objects.
- Bedrock Lambdas have only model/guardrail invocation permissions required.
- Hospital-admin APIs can query/update through backend logic but must still enforce hospital scope in application code.
- Do not grant public S3 read/list access.

---

# 15. Seed data

Create a seed script.

Requirements:

- At least 10 realistic demo hospitals in one Indian city.
- Include government and private hospitals.
- Include multiple departments.
- Include multiple doctors per hospital.
- Include doctor qualifications, timings, fees, facilities, laboratory tests, prices, and relevant instructions.
- Include clear demo-only wording where appropriate.
- Include **Sharda Hospital**.
- Include at least one test hospital-admin mapping for Sharda Hospital.
- Include a documented method to create/map the test Cognito hospital-admin user without committing a real password.
- Include another hospital/admin mapping to verify cross-hospital appointment isolation.

Seed data should support the mandatory appointment demonstration without manual database editing.

---

# 16. File and project organization

Use a clean, maintainable structure. Adapt exact paths if needed, but preserve separation of concerns.

```
app/
  (public)/
  auth/
  hospitals/
  get-diagnosed/
  dashboard/
  hospital-admin/

src/
  components/
  features/
  lib/
    api/
    auth/
    repositories/
    services/
    validation/
    ai/
      prompts/
  types/

infra/
  bin/
  lib/

scripts/
  seed.ts

docs/
  dynamodb-schema.md
  appointment-lifecycle.md

tests/
```

Keep:

- UI components reusable
- Business logic in services
- DynamoDB access in repositories
- Zod schemas in validation modules
- Bedrock prompts in dedicated prompt files
- Authorization checks on server side
- Comments limited to non-obvious logic

---

# 17. Required documentation and deliverables

Create all of the following.

1. Complete source code
2. CDK infrastructure code
3. DynamoDB schema documentation
4. Appointment lifecycle documentation
5. S3 secure upload/download flow
6. Cognito auth and role flow
7. Textract/Bedrock integration
8. Seed script
9. `.env.example`
10. `README.md`
11. `implementation_plan.md`
12. Final implementation summary

## README must include

- Prerequisites
- Local setup
- AWS account/setup requirements
- Required environment variables
- CDK deployment commands
- Amplify deployment setup
- Seed commands
- Local frontend/backend running instructions
- How to create initial hospital-admin users
- How to map a hospital admin to Sharda Hospital
- How to run the appointment bridge verification
- How to configure Bedrock model access and Guardrails
- Known required environment configuration after deployment

## Final implementation summary must list

- Completed pages
- Completed APIs
- AWS services provisioned
- DynamoDB indexes
- Authentication/authorization model
- Appointment lifecycle implementation
- Seeded demo accounts/mappings without exposing secrets
- Remaining environment configuration steps
- Test/lint/typecheck/build results

---

# 18. Completion and verification checklist

Before declaring completion:

- Run linting.
- Run TypeScript type checking.
- Run available tests.
- Run production build.
- Fix all errors.
- Verify responsive pages.
- Verify patient cannot access another patient’s record/document.
- Verify hospital admin cannot access another hospital’s management data or appointments.
- Verify patient appointment request reaches the correct hospital administrator.
- Verify Sharda Hospital admin sees Sharda Hospital requests.
- Verify another hospital admin does not see Sharda Hospital requests.
- Verify accepted appointment creates exactly one patient calendar event.
- Verify rejected appointment does not create a calendar event.
- Verify hospital chatbot does not fabricate unavailable data.
- Verify personal chatbot returns citations from only the logged-in patient’s confirmed records.
- Verify no S3 medical document is publicly accessible.
- Verify no AWS credentials are hardcoded.
- Verify all protected API bodies are validated with Zod.

Build the complete working application now, following this specification exactly.