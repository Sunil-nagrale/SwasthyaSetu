import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000'),
  AWS_REGION: z.string().default('ap-south-1'),
  DYNAMODB_TABLE_NAME: z.string().default('swasthyasetu-main-table'),
  S3_BUCKET_NAME: z.string().default('swasthyasetu-medical-records-bucket'),
  COGNITO_USER_POOL_ID: z.string().default('ap-south-1_dummy_pool'),
  COGNITO_CLIENT_ID: z.string().default('dummy_cognito_client_id'),
  BEDROCK_MODEL_ID: z.string().default('eu.anthropic.claude-haiku-4-5-20251001-v1:0'),
  BEDROCK_GUARDRAIL_ID: z.string().optional(),
  BEDROCK_GUARDRAIL_VERSION: z.string().default('DRAFT'),
  USE_MOCK_AWS: z.string().default('true').transform((v) => v === 'true' || v === '1'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function loadEnv(override?: Partial<Record<string, string>>): EnvConfig {
  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    AWS_REGION: process.env.AWS_REGION,
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID,
    BEDROCK_GUARDRAIL_ID: process.env.BEDROCK_GUARDRAIL_ID,
    BEDROCK_GUARDRAIL_VERSION: process.env.BEDROCK_GUARDRAIL_VERSION,
    USE_MOCK_AWS: process.env.USE_MOCK_AWS,
    ...override,
  };

  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.format());
    throw new Error('Invalid environment configuration');
  }

  return parsed.data;
}

export const env = loadEnv();

/** Expected Cognito issuer string. Does not verify JWT signatures. */
export function cognitoIssuer(config: EnvConfig = env): string {
  return `https://cognito-idp.${config.AWS_REGION}.amazonaws.com/${config.COGNITO_USER_POOL_ID}`;
}

/**
 * Mock tokens and unsigned JWT decoding are allowed only when mock AWS is on
 * and NODE_ENV is not production.
 */
export function isMockAuthEnabled(config: EnvConfig = env): boolean {
  return config.USE_MOCK_AWS && config.NODE_ENV !== 'production';
}
