#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SwasthyaSetuStack } from '../lib/swasthya-setu-stack';

const app = new cdk.App();

const envName = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'eu-north-1';
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID || '663252309163';

new SwasthyaSetuStack(app, `swasthyasetu-${envName}`, {
  env: {
    account,
    region,
  },
  description: 'SwasthyaSetu Serverless Healthcare Infrastructure (API Gateway, Lambda, DynamoDB, S3, Cognito, Bedrock, Textract)',
  environmentName: envName,
});
