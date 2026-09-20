# SwasthyaSetu (स्वास्थ्य सेतु) 🏥

**SwasthyaSetu** is an enterprise-grade, AWS-native digital healthcare coordination platform designed to seamlessly connect patients, hospitals, and medical practitioners across India.

🌐 **Live Production Website:** [https://prod.d3r40k5ts158fm.amplifyapp.com](https://prod.d3r40k5ts158fm.amplifyapp.com)  
⚡ **Live Backend API Gateway:** [https://te0bqg0js8.execute-api.eu-north-1.amazonaws.com/dev/](https://te0bqg0js8.execute-api.eu-north-1.amazonaws.com/dev/)  
☁️ **AWS Region:** `eu-north-1` (Stockholm) | **Account:** `663252309163`

---

## Key Features

- 🏥 **Public Hospital Catalog & Doctor Directory:** Search hospitals, explore specialized departments, view doctor credentials, consultation fees, OPD timings, and lunch break intervals.
- 📅 **Dynamic Doctor Slot Booking:** Calculates real-time 20/30-minute consultation slots strictly respecting doctor shifts and excluding lunch break windows.
- 🩺 **Safe AI Symptom Guidance & Triage:** Safe symptom assessment with emergency red-flag detection (halting with `ERR_EMERGENCY_HALT` and directing to emergency helplines), structured differential insights, and recommended specialists.
- 📄 **Prescription & Medical Report OCR:** Secure upload to private S3 buckets via presigned URLs with 5-minute TTL, Amazon Textract OCR extraction, and patient confirmation workflows.
- 💊 **Medication Calendar & Treatment Tracking:** Confirmed prescriptions automatically populate active medications into the patient's treatment calendar with active/completed/cured lifecycle tracking.
- 🤖 **Grounded AI Enquiry Chatbots:** Hospital enquiry chatbot grounded strictly in verified hospital records, and personal health assistant grounded strictly in confirmed patient records with full cross-patient data isolation.
- 🔐 **Zero-Trust Security & Role-Based Access:** Amazon Cognito User Pools with strict RBAC (`patient`, `hospital_admin`, `admin`), patient resource ownership assertion (`ERR_OWNERSHIP_VIOLATION`), and server-side hospital-admin scoping (`ERR_SCOPE_VIOLATION`).
- 🛡️ **Medical PHI Redaction:** Structured logger automatically redacts passwords, tokens, patient notes, symptoms, and clinical findings before persisting logs.

---

## Repository Architecture

```
SwasthyaSetu/
├── api-contract/
│   └── api-contract.md          # Frozen API Contract v1.0 (single source of truth)
├── backend/                     # TypeScript AWS Lambda backend
│   ├── scripts/
│   │   └── seed.ts              # Database seed script for DynamoDB single-table
│   ├── src/
│   │   ├── aws/                 # AWS SDK v3 clients (S3, Textract, Bedrock, Cognito)
│   │   ├── config/              # Zod environment configuration and validation
│   │   ├── handlers/            # API Gateway route handlers
│   │   ├── http/                # HTTP router and path matching
│   │   ├── lambda.ts            # AWS Lambda entry point and route dispatcher
│   │   ├── middleware/          # Cognito auth, error handling, request parsing
│   │   ├── repositories/        # Single-table DynamoDB & In-Memory repositories
│   │   ├── services/            # Domain business logic
│   │   ├── types/               # TypeScript data models and DTOs
│   │   ├── utils/               # Logger with PHI redaction, standardized errors, responses
│   │   └── validators/          # Zod request validation schemas
│   ├── tests/                   # 93 automated unit and integration tests (100% pass)
│   ├── README.md                # Backend architecture & DynamoDB single-table layout
│   └── package.json
├── frontend/                    # Next.js 14 Web Application
│   ├── src/
│   │   ├── app/                 # App Router (pages: home, hospitals, appointments, auth, etc.)
│   │   ├── components/          # Reusable UI components (buttons, modals, cards, badges)
│   │   ├── contexts/            # React AuthContext, ToastContext
│   │   ├── lib/api/             # API clients for backend communication
│   │   └── types/               # Frontend TypeScript interfaces
│   ├── .env.example             # Local development environment template
│   ├── next.config.mjs          # Next.js build and export configuration
│   └── package.json
├── infra/                       # AWS CDK v2 Infrastructure as Code
│   ├── bin/
│   │   └── infra.ts             # CDK app entrypoint
│   ├── lib/
│   │   └── swasthya-setu-stack.ts # CloudFormation stack (DynamoDB, S3, Cognito, Lambda, API GW)
│   ├── cdk.json
│   └── package.json
└── specification/
    └── swathyasetu-spec.md.md   # Full project implementation specification
```

---

## Live Demo & Synthetic Test Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Patient** | `synthetic_patient_test_01@swasthyasetu.local` | `DemoPassword123!` | Patient dashboard, appointments, uploads, medications |
| **Hospital Admin** | `sharda-admin@example.com` | Demo / Mock Auth | Sharda Hospital admin portal, appointment management |
| **Super Admin** | `superadmin@example.com` | Demo / Mock Auth | Platform-wide hospital, doctor, department management |

*(Note: Synthetic/demo data only. No real patient data is used.)*

---

## Local Development Setup

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 1. Start Local Backend (Port 4000)
```bash
cd backend
npm install
npm run dev
```
The local backend starts on `http://localhost:4000` using in-memory repositories and mock AWS services for rapid offline development.

### 2. Start Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Automated Test Suites

```bash
# Run backend test suite (93 unit & integration tests)
cd backend
npm test

# Typecheck backend
npm run typecheck

# Typecheck frontend
cd ../frontend
npm run typecheck

# Build frontend static distribution
npm run build
```

---

## AWS Infrastructure Deployment (CDK)

Deployed with AWS CDK v2 in `eu-north-1`:

```bash
cd infra
npm install
npx cdk synth
npx cdk deploy swasthyasetu-dev --require-approval never
```

### Deployed AWS Resources:
- **Amazon API Gateway:** REST API with CORS enabled for production & local origins.
- **AWS Lambda:** Node.js 20.x serverless runtime with least-privilege IAM execution role.
- **Amazon DynamoDB:** Single-table design (`swasthyasetu-dev-main-table`) with `GSI1` and `GSI2`.
- **Amazon S3:** Private bucket (`swasthyasetu-docs-663252309163-eu-north-1-dev`) with strict SSE-S3 encryption and block public access.
- **Amazon Cognito:** User Pool (`eu-north-1_O8cwcDNOo`) with groups `patient`, `hospital_admin`, `admin`.
- **AWS Amplify Hosting:** Global HTTPS delivery at `https://prod.d3r40k5ts158fm.amplifyapp.com`.
