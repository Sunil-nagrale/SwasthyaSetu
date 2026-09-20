import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export interface SwasthyaSetuStackProps extends cdk.StackProps {
  environmentName: string;
}

export class SwasthyaSetuStack extends cdk.Stack {
  public readonly apiGatewayUrl: string;
  public readonly cognitoUserPoolId: string;
  public readonly cognitoAppClientId: string;
  public readonly dynamoDbTableName: string;
  public readonly s3BucketName: string;
  public readonly lambdaFunctionName: string;

  constructor(scope: Construct, id: string, props: SwasthyaSetuStackProps) {
    super(scope, id, props);

    const envName = props.environmentName;

    // Support single origin, array, or comma-separated origins from context or env
    const rawOrigins =
      this.node.tryGetContext('corsAllowedOrigins') ||
      this.node.tryGetContext('corsAllowedOrigin') ||
      process.env.CORS_ALLOWED_ORIGINS ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const allowedOrigins: string[] = Array.isArray(rawOrigins)
      ? (rawOrigins as string[])
      : String(rawOrigins)
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);

    if (!allowedOrigins.includes('http://localhost:3000')) {
      allowedOrigins.push('http://localhost:3000');
    }
    const publicOrigins = [
      'https://prod.d3r40k5ts158fm.amplifyapp.com',
      'https://main.d3r40k5ts158fm.amplifyapp.com',
      'http://swasthyasetu-web-663252309163.s3-website.eu-north-1.amazonaws.com',
    ];
    for (const origin of publicOrigins) {
      if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
      }
    }

    // ==========================================
    // 1. Amazon DynamoDB (Single-Table Design)
    // ==========================================
    const tableName = process.env.DYNAMODB_TABLE_NAME || `swasthyasetu-${envName}-main-table`;
    const table = dynamodb.Table.fromTableName(this, 'MainTable', tableName);
    this.dynamoDbTableName = table.tableName;

    // ==========================================
    // 2. Amazon S3 (Private Medical Records)
    // ==========================================
    const bucketName =
      process.env.S3_BUCKET_NAME ||
      `swasthyasetu-docs-${this.account}-${this.region}-${envName}`;
    const bucket = s3.Bucket.fromBucketName(this, 'MedicalRecordsBucket', bucketName);
    this.s3BucketName = bucket.bucketName;

    // ==========================================
    // 3. Amazon Cognito (Authentication & RBAC)
    // ==========================================
    const userPoolId = process.env.COGNITO_USER_POOL_ID || 'eu-north-1_O8cwcDNOo';
    const userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', userPoolId);

    // Defined roles: patient, hospital_admin, admin
    new cognito.CfnUserPoolGroup(this, 'PatientGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'patient',
      description: 'SwasthyaSetu patient users',
    });

    new cognito.CfnUserPoolGroup(this, 'HospitalAdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'hospital_admin',
      description: 'SwasthyaSetu hospital administrative staff',
    });

    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admin',
      description: 'SwasthyaSetu platform super administrators',
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'WebClient', {
      userPool,
      userPoolClientName: `swasthyasetu-${envName}-web-client`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    this.cognitoUserPoolId = userPool.userPoolId;
    this.cognitoAppClientId = userPoolClient.userPoolClientId;

    // ==========================================
    // 4. IAM Execution Role (Least Privilege)
    // ==========================================
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `swasthyasetu-${envName}-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for SwasthyaSetu backend Lambda with least privilege permissions',
    });

    // CloudWatch Logs
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudWatchLogging',
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/swasthyasetu-${envName}-api:*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/swasthyasetu-${envName}-api`,
        ],
      })
    );

    // DynamoDB Table & GSI Operations
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DynamoDbOperations',
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [table.tableArn, `${table.tableArn}/index/*`],
      })
    );

    // S3 Object Read/Write
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3ObjectOperations',
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [`${bucket.bucketArn}/*`],
      })
    );

    // Amazon Textract Document Analysis
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'TextractAnalysis',
        actions: ['textract:AnalyzeDocument'],
        resources: ['*'],
      })
    );

    // Amazon Bedrock Model Invocation (Least Privilege: scoped to regional models and inference profiles)
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'BedrockModelInvocation',
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:*::foundation-model/*`,
          `arn:aws:bedrock:*:${this.account}:inference-profile/*`,
          `arn:aws:bedrock:*:*:inference-profile/*`,
        ],
      })
    );

    // Amazon Cognito User Pool Interaction
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CognitoOperations',
        actions: ['cognito-idp:SignUp', 'cognito-idp:InitiateAuth'],
        resources: [userPool.userPoolArn],
      })
    );

    // ==========================================
    // 5. AWS Lambda Backend Function
    // ==========================================
    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      functionName: `swasthyasetu-${envName}-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend'), {
        exclude: ['tests', 'src', '.git', '*.md', 'tsconfig.json'],
      }),
      role: lambdaRole,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
        USE_MOCK_AWS: 'false',
        DYNAMODB_TABLE_NAME: table.tableName,
        S3_BUCKET_NAME: bucket.bucketName,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        BEDROCK_MODEL_ID:
          process.env.BEDROCK_MODEL_ID || 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
        BEDROCK_GUARDRAIL_VERSION: 'DRAFT',
      },
    });

    this.lambdaFunctionName = backendLambda.functionName;

    // ==========================================
    // 6. Amazon API Gateway REST API
    // ==========================================
    const api = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: `swasthyasetu-${envName}-api`,
      description: 'SwasthyaSetu REST API Gateway proxying to backend Lambda',
      cloudWatchRole: false,
      deployOptions: {
        stageName: envName,
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
        dataTraceEnabled: false,
        metricsEnabled: false,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'CognitoAuthorizer',
      {
        cognitoUserPools: [userPool],
        authorizerName: `swasthyasetu-${envName}-cognito-authorizer`,
      }
    );

    const integration = new apigateway.LambdaIntegration(backendLambda, {
      proxy: true,
      scopePermissionToMethod: false,
    });

    // Helper to resolve or create resource path hierarchy
    const getOrCreateResource = (root: apigateway.IResource, pathString: string): apigateway.IResource => {
      const segments = pathString.split('/').filter(Boolean);
      let current = root;
      for (const segment of segments) {
        const existing = current.getResource(segment);
        current = existing ?? current.addResource(segment);
      }
      return current;
    };

    // Public API Routes (No Cognito authorization required)
    const publicRoutes: Array<{ method: string; path: string }> = [
      { method: 'GET', path: 'health' },
      { method: 'GET', path: 'hospitals' },
      { method: 'GET', path: 'hospitals/{hospitalId}' },
      { method: 'GET', path: 'hospitals/{hospitalId}/departments' },
      { method: 'GET', path: 'hospitals/{hospitalId}/departments/{departmentId}' },
      { method: 'GET', path: 'hospitals/{hospitalId}/doctors' },
      { method: 'GET', path: 'hospitals/{hospitalId}/labs' },
      { method: 'GET', path: 'hospitals/{hospitalId}/doctors/{doctorId}/availability' },
      { method: 'POST', path: 'diagnosis/symptom' },
      { method: 'GET', path: 'diagnosis/question' },
      { method: 'POST', path: 'diagnosis/result' },
      { method: 'POST', path: 'auth/signup' },
      { method: 'POST', path: 'auth/login' },
    ];

    // Public Root Route (GET / returns service health status)
    api.root.addMethod('GET', integration, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    for (const route of publicRoutes) {
      const res = getOrCreateResource(api.root, route.path);
      res.addMethod(route.method, integration, {
        authorizationType: apigateway.AuthorizationType.NONE,
      });
    }

    // Protected API Routes (Cognito Authorization Required)
    const protectedRoutes: Array<{ method: string; path: string }> = [
      { method: 'POST', path: 'chatbot/hospital' },
      { method: 'POST', path: 'chatbot/patient' },
      { method: 'GET', path: 'profile' },
      { method: 'PUT', path: 'profile' },
      { method: 'POST', path: 'appointments' },
      { method: 'GET', path: 'appointments' },
      { method: 'GET', path: 'appointments/{appointmentId}' },
      { method: 'GET', path: 'admin/appointments' },
      { method: 'PATCH', path: 'admin/appointments/{appointmentId}' },
      { method: 'POST', path: 'prescriptions/upload-url' },
      { method: 'POST', path: 'prescriptions/{prescriptionId}/process' },
      { method: 'PATCH', path: 'prescriptions/{prescriptionId}/confirm' },
      { method: 'PATCH', path: 'prescriptions/{prescriptionId}/status' },
      { method: 'GET', path: 'prescriptions' },
      { method: 'GET', path: 'prescriptions/{prescriptionId}' },
      { method: 'POST', path: 'reports/upload-url' },
      { method: 'POST', path: 'reports/{reportId}/process' },
      { method: 'PATCH', path: 'reports/{reportId}/confirm' },
      { method: 'GET', path: 'reports' },
      { method: 'GET', path: 'reports/{reportId}' },
      { method: 'GET', path: 'medications' },
      { method: 'GET', path: 'calendar' },
      { method: 'POST', path: 'calendar' },
      { method: 'PUT', path: 'calendar/{eventId}' },
      { method: 'DELETE', path: 'calendar/{eventId}' },
      { method: 'POST', path: 'admin/hospitals' },
      { method: 'GET', path: 'admin/hospitals' },
      { method: 'GET', path: 'admin/hospitals/{hospitalId}' },
      { method: 'PUT', path: 'admin/hospitals/{hospitalId}' },
      { method: 'DELETE', path: 'admin/hospitals/{hospitalId}' },
      { method: 'POST', path: 'admin/departments' },
      { method: 'GET', path: 'admin/departments' },
      { method: 'PUT', path: 'admin/departments/{departmentId}' },
      { method: 'DELETE', path: 'admin/departments/{departmentId}' },
      { method: 'POST', path: 'admin/doctors' },
      { method: 'GET', path: 'admin/doctors' },
      { method: 'PUT', path: 'admin/doctors/{doctorId}' },
      { method: 'DELETE', path: 'admin/doctors/{doctorId}' },
      { method: 'POST', path: 'admin/schedules' },
      { method: 'PUT', path: 'admin/schedules/{scheduleId}' },
      { method: 'DELETE', path: 'admin/schedules/{scheduleId}' },
      { method: 'POST', path: 'admin/labs' },
      { method: 'PUT', path: 'admin/labs/{labId}' },
      { method: 'DELETE', path: 'admin/labs/{labId}' },
    ];

    for (const route of protectedRoutes) {
      const res = getOrCreateResource(api.root, route.path);
      res.addMethod(route.method, integration, {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    }

    this.apiGatewayUrl = api.url;

    // ==========================================
    // 7. CloudFormation Outputs
    // ==========================================
    new cdk.CfnOutput(this, 'OutputApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway root deployment URL',
      exportName: `swasthyasetu-${envName}-api-url`,
    });

    new cdk.CfnOutput(this, 'OutputCognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `swasthyasetu-${envName}-cognito-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'OutputCognitoAppClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito Web App Client ID',
      exportName: `swasthyasetu-${envName}-cognito-client-id`,
    });

    new cdk.CfnOutput(this, 'OutputDynamoDbTableName', {
      value: table.tableName,
      description: 'DynamoDB Single-Table Name',
      exportName: `swasthyasetu-${envName}-dynamodb-table`,
    });

    new cdk.CfnOutput(this, 'OutputS3BucketName', {
      value: bucket.bucketName,
      description: 'S3 Private Medical Records Bucket Name',
      exportName: `swasthyasetu-${envName}-s3-bucket`,
    });

    new cdk.CfnOutput(this, 'OutputLambdaFunctionName', {
      value: backendLambda.functionName,
      description: 'Backend Lambda Function Name',
      exportName: `swasthyasetu-${envName}-lambda-function`,
    });

    new cdk.CfnOutput(this, 'OutputAwsRegion', {
      value: this.region,
      description: 'AWS Region for SwasthyaSetu Deployment',
      exportName: `swasthyasetu-${envName}-region`,
    });
  }
}
