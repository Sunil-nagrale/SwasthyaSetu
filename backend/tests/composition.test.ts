import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../src/config/env.js';
import {
  assertProductionAwsConfig,
  createAppContainer,
} from '../src/repositories/container.js';
import { InMemoryHospitalRepository } from '../src/repositories/in-memory/in-memory-hospital.repository.js';
import { InMemoryAppointmentRepository } from '../src/repositories/in-memory/in-memory-appointment.repository.js';
import { DynamoHospitalRepository } from '../src/repositories/dynamodb/dynamodb-hospital.repository.js';
import { DynamoAppointmentRepository } from '../src/repositories/dynamodb/dynamodb-appointment.repository.js';
import { AwsS3Service, MockS3Service } from '../src/aws/s3.client.js';
import { AwsTextractService, MockTextractService } from '../src/aws/textract.client.js';
import { AwsCognitoService, MockCognitoService } from '../src/aws/cognito.client.js';
import { MockBedrockService } from '../src/aws/bedrock.client.js';
import { AwsBedrockService } from '../src/aws/bedrock.aws.js';
import { InternalServerError } from '../src/utils/errors.js';

const productionEnv = () =>
  loadEnv({
    NODE_ENV: 'test',
    USE_MOCK_AWS: 'false',
    AWS_REGION: 'ap-south-1',
    DYNAMODB_TABLE_NAME: 'swasthyasetu-main-table',
    S3_BUCKET_NAME: 'swasthyasetu-medical-records-bucket',
    COGNITO_USER_POOL_ID: 'ap-south-1_RealPool01',
    COGNITO_CLIENT_ID: '1a2b3c4d5e6f7g8h9i0jklmnop',
    BEDROCK_MODEL_ID: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
  });

describe('Repository composition root', () => {
  test('USE_MOCK_AWS=true selects in-memory repositories and mock AWS adapters', () => {
    const container = createAppContainer(
      loadEnv({ NODE_ENV: 'test', USE_MOCK_AWS: 'true' })
    );

    assert.equal(container.useMockAws, true);
    assert.ok(container.hospitalRepo instanceof InMemoryHospitalRepository);
    assert.ok(container.appointmentRepo instanceof InMemoryAppointmentRepository);
    assert.ok(container.s3 instanceof MockS3Service);
    assert.ok(container.textract instanceof MockTextractService);
    assert.ok(container.cognito instanceof MockCognitoService);
    assert.ok(container.bedrock instanceof MockBedrockService);
  });

  test('USE_MOCK_AWS=false with real identifiers selects DynamoDB and AWS adapters', () => {
    const container = createAppContainer(productionEnv());

    assert.equal(container.useMockAws, false);
    assert.ok(container.hospitalRepo instanceof DynamoHospitalRepository);
    assert.ok(container.appointmentRepo instanceof DynamoAppointmentRepository);
    assert.ok(container.s3 instanceof AwsS3Service);
    assert.ok(container.textract instanceof AwsTextractService);
    assert.ok(container.cognito instanceof AwsCognitoService);
    assert.ok(container.bedrock instanceof AwsBedrockService);
  });

  test('USE_MOCK_AWS=false with placeholder Cognito IDs is rejected', () => {
    const config = loadEnv({
      NODE_ENV: 'test',
      USE_MOCK_AWS: 'false',
    });

    assert.throws(
      () => assertProductionAwsConfig(config),
      (err: unknown) =>
        err instanceof InternalServerError &&
        err.code === 'ERR_AWS_NOT_CONFIGURED' &&
        err.message.includes('COGNITO_USER_POOL_ID') &&
        err.message.includes('COGNITO_CLIENT_ID')
    );

    assert.throws(
      () => createAppContainer(config),
      (err: unknown) => err instanceof InternalServerError && err.code === 'ERR_AWS_NOT_CONFIGURED'
    );
  });
});
