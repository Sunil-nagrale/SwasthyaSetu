import { env, type EnvConfig } from '../config/env.js';
import { InternalServerError } from '../utils/errors.js';
import { inMemoryAppointmentRepo } from './in-memory/in-memory-appointment.repository.js';
import { inMemoryHospitalRepo } from './in-memory/in-memory-hospital.repository.js';
import { inMemoryCalendarRepo } from './in-memory/in-memory-calendar.repository.js';
import { inMemoryUserRepo } from './in-memory/in-memory-user.repository.js';
import { inMemoryRecordRepo } from './in-memory/in-memory-record.repository.js';
import { inMemoryHospitalAdminMappingRepo } from './in-memory/in-memory-hospital-admin-mapping.repository.js';
import { inMemoryDiagnosisSessionRepo } from './in-memory/in-memory-diagnosis-session.repository.js';
import { dynamoAppointmentRepo } from './dynamodb/dynamodb-appointment.repository.js';
import { dynamoHospitalRepo } from './dynamodb/dynamodb-hospital.repository.js';
import { dynamoCalendarRepo } from './dynamodb/dynamodb-calendar.repository.js';
import { dynamoUserRepo } from './dynamodb/dynamodb-user.repository.js';
import { dynamoRecordRepo } from './dynamodb/dynamodb-record.repository.js';
import { dynamoHospitalAdminMappingRepo } from './dynamodb/dynamodb-hospital-admin-mapping.repository.js';
import { dynamoDiagnosisSessionRepo } from './dynamodb/dynamodb-diagnosis-session.repository.js';
import type { IAppointmentRepository } from './interfaces/appointment.repository.js';
import type { IHospitalRepository } from './interfaces/hospital.repository.js';
import type { ICalendarRepository } from './interfaces/calendar.repository.js';
import type { IUserRepository } from './interfaces/user.repository.js';
import type { IRecordRepository } from './interfaces/record.repository.js';
import type { IHospitalAdminMappingRepository } from './interfaces/hospital-admin-mapping.repository.js';
import type { IDiagnosisSessionRepository } from './interfaces/diagnosis-session.repository.js';
import { AwsS3Service, MockS3Service, type IS3Service } from '../aws/s3.client.js';
import { AwsTextractService, MockTextractService, type ITextractService } from '../aws/textract.client.js';
import { AwsCognitoService, MockCognitoService, type ICognitoService } from '../aws/cognito.client.js';
import { MockBedrockService, type IBedrockService } from '../aws/bedrock.client.js';
import { AwsBedrockService } from '../aws/bedrock.aws.js';

const PLACEHOLDER_VALUE = /dummy|placeholder|x{8,}/i;

export interface AppContainer {
  useMockAws: boolean;
  appointmentRepo: IAppointmentRepository;
  hospitalRepo: IHospitalRepository;
  calendarRepo: ICalendarRepository;
  userRepo: IUserRepository;
  recordRepo: IRecordRepository;
  hospitalAdminMappingRepo: IHospitalAdminMappingRepository;
  diagnosisSessionRepo: IDiagnosisSessionRepository;
  s3: IS3Service;
  textract: ITextractService;
  cognito: ICognitoService;
  bedrock: IBedrockService;
}

function isMissingOrPlaceholder(value: string | undefined): boolean {
  if (!value || value.trim().length === 0) return true;
  return PLACEHOLDER_VALUE.test(value);
}

/**
 * When mock AWS is disabled, refuse dummy/placeholder resource identifiers.
 * Does not create AWS resources or invent IDs.
 */
export function assertProductionAwsConfig(config: EnvConfig): void {
  if (config.USE_MOCK_AWS) return;

  const missing: string[] = [];
  if (isMissingOrPlaceholder(config.AWS_REGION)) missing.push('AWS_REGION');
  if (isMissingOrPlaceholder(config.DYNAMODB_TABLE_NAME)) missing.push('DYNAMODB_TABLE_NAME');
  if (isMissingOrPlaceholder(config.S3_BUCKET_NAME)) missing.push('S3_BUCKET_NAME');
  if (isMissingOrPlaceholder(config.COGNITO_USER_POOL_ID)) missing.push('COGNITO_USER_POOL_ID');
  if (isMissingOrPlaceholder(config.COGNITO_CLIENT_ID)) missing.push('COGNITO_CLIENT_ID');
  if (isMissingOrPlaceholder(config.BEDROCK_MODEL_ID)) missing.push('BEDROCK_MODEL_ID');

  if (missing.length > 0) {
    throw new InternalServerError(
      `Missing or placeholder AWS configuration while USE_MOCK_AWS=false: ${missing.join(', ')}`,
      'ERR_AWS_NOT_CONFIGURED'
    );
  }
}

export function createAppContainer(config: EnvConfig = env): AppContainer {
  assertProductionAwsConfig(config);

  if (config.USE_MOCK_AWS) {
    return {
      useMockAws: true,
      appointmentRepo: inMemoryAppointmentRepo,
      hospitalRepo: inMemoryHospitalRepo,
      calendarRepo: inMemoryCalendarRepo,
      userRepo: inMemoryUserRepo,
      recordRepo: inMemoryRecordRepo,
      hospitalAdminMappingRepo: inMemoryHospitalAdminMappingRepo,
      diagnosisSessionRepo: inMemoryDiagnosisSessionRepo,
      s3: new MockS3Service(),
      textract: new MockTextractService(),
      cognito: new MockCognitoService(),
      bedrock: new MockBedrockService(),
    };
  }

  return {
    useMockAws: false,
    appointmentRepo: dynamoAppointmentRepo,
    hospitalRepo: dynamoHospitalRepo,
    calendarRepo: dynamoCalendarRepo,
    userRepo: dynamoUserRepo,
    recordRepo: dynamoRecordRepo,
    hospitalAdminMappingRepo: dynamoHospitalAdminMappingRepo,
    diagnosisSessionRepo: dynamoDiagnosisSessionRepo,
    s3: new AwsS3Service(),
    textract: new AwsTextractService(),
    cognito: new AwsCognitoService(),
    bedrock: new AwsBedrockService(),
  };
}

export const appContainer = createAppContainer(env);

export const appointmentRepo = appContainer.appointmentRepo;
export const hospitalRepo = appContainer.hospitalRepo;
export const calendarRepo = appContainer.calendarRepo;
export const userRepo = appContainer.userRepo;
export const recordRepo = appContainer.recordRepo;
export const hospitalAdminMappingRepo = appContainer.hospitalAdminMappingRepo;
export const diagnosisSessionRepo = appContainer.diagnosisSessionRepo;
export const s3Service = appContainer.s3;
export const textractService = appContainer.textract;
export const cognitoService = appContainer.cognito;
export const bedrockService = appContainer.bedrock;
