import { env } from '../../config/env.js';

export interface DynamoKey {
  PK: string;
  SK: string;
}

export interface DynamoItem extends DynamoKey {
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
  [key: string]: unknown;
}

export class DynamoDbConfig {
  static get tableName(): string {
    return env.DYNAMODB_TABLE_NAME;
  }

  static get region(): string {
    return env.AWS_REGION;
  }

  static isMock(): boolean {
    return env.USE_MOCK_AWS;
  }
}
