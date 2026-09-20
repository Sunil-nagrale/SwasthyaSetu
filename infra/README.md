# SwasthyaSetu AWS Infrastructure (AWS CDK)

This package contains the Infrastructure as Code (IaC) for **SwasthyaSetu** built with AWS CDK v2 in TypeScript.

## Architecture

The stack provisions the following resources:

1. **Amazon DynamoDB**: Single-table design (`swasthyasetu-dev-main-table`) with partition key `PK`, sort key `SK`, and two Global Secondary Indexes (`GSI1` and `GSI2`) supporting all entity types and query access patterns.
2. **Amazon S3**: Private medical records bucket (`swasthyasetu-docs-{account}-{region}-dev`) with `BlockPublicAccess.BLOCK_ALL`, TLS enforcement, S3 managed encryption, and CORS configuration.
3. **Amazon Cognito**: User Pool (`swasthyasetu-dev-user-pool`) with email sign-in, self sign-up, custom role attribute, and 3 User Pool Groups: `patient`, `hospital_admin`, `admin`. App Client configured with `USER_PASSWORD_AUTH` and `USER_SRP_AUTH` without client secret.
4. **AWS Lambda**: Node.js 20.x runtime function (`swasthyasetu-dev-api`) deploying the compiled backend handler (`dist/lambda.handler`) with configured production environment variables.
5. **IAM Execution Role**: Least-privilege role with strict granular access to DynamoDB table/indexes, S3 bucket objects, Amazon Textract document analysis, Amazon Bedrock model invocation, Cognito user pool, and CloudWatch log groups.
6. **Amazon API Gateway**: REST API (`swasthyasetu-dev-api`) with 42 catalog routes. Public routes are unauthenticated, while protected routes enforce the `CognitoUserPoolsAuthorizer`. CORS is pre-configured.

## Prerequisites

- Node.js 20+
- AWS CLI v2 configured with profile `swasthyasetu`
- Active AWS SSO credentials: `aws sts get-caller-identity --profile swasthyasetu`

## Commands

### Install Dependencies
```bash
npm.cmd install
```

### Build TypeScript
```bash
npm.cmd run build
```

### Synthesize CloudFormation Template
```bash
npm.cmd run synth -- --profile swasthyasetu
```

### CDK Diff (Inspect proposed changes before deployment)
```bash
npx.cmd cdk diff --profile swasthyasetu
```

### CDK Deploy (Deploy to AWS — Requires Explicit Approval)
```bash
npx.cmd cdk deploy --profile swasthyasetu
```

## Outputs

Upon deployment, CloudFormation generates:
- `ApiGatewayUrl`: Root URL for the API Gateway stage
- `CognitoUserPoolId`: ID of the created Cognito User Pool
- `CognitoAppClientId`: Client ID for the web frontend
- `DynamoDbTableName`: Name of the DynamoDB table
- `S3BucketName`: Private document storage bucket name
- `LambdaFunctionName`: Backend Lambda function name
- `Region`: Deployment AWS region
