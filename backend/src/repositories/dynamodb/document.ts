import { env } from '../../config/env.js';
import { InternalServerError } from '../../utils/errors.js';
import type { DynamoItem } from './dynamodb-client.js';

type DynamoDbDocumentClient = {
  send: (command: unknown) => Promise<unknown>;
};

let documentClient: DynamoDbDocumentClient | null = null;

async function loadSdk() {
  const dynamodb = await import('@aws-sdk/client-dynamodb');
  const lib = await import('@aws-sdk/lib-dynamodb');
  return { dynamodb, lib };
}

export async function getDocumentClient(): Promise<DynamoDbDocumentClient> {
  if (env.USE_MOCK_AWS) {
    throw new InternalServerError(
      'DynamoDB document client requested while USE_MOCK_AWS=true',
      'ERR_AWS_NOT_CONFIGURED'
    );
  }

  if (documentClient) return documentClient;

  const { dynamodb, lib } = await loadSdk();
  const awsClient = new dynamodb.DynamoDBClient({ region: env.AWS_REGION });
  const created = lib.DynamoDBDocumentClient.from(awsClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
  const adapter: DynamoDbDocumentClient = {
    send: (command: unknown) => created.send(command as Parameters<typeof created.send>[0]),
  };
  documentClient = adapter;
  return adapter;
}

export async function putItem(item: DynamoItem): Promise<void> {
  const { lib } = await loadSdk();
  const client = await getDocumentClient();
  await client.send(
    new lib.PutCommand({
      TableName: env.DYNAMODB_TABLE_NAME,
      Item: item,
    })
  );
}

export async function getItem(pk: string, sk: string): Promise<DynamoItem | undefined> {
  const { lib } = await loadSdk();
  const client = await getDocumentClient();
  const res = (await client.send(
    new lib.GetCommand({
      TableName: env.DYNAMODB_TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
  )) as { Item?: DynamoItem };
  return res.Item;
}

export async function deleteItem(pk: string, sk: string): Promise<void> {
  const { lib } = await loadSdk();
  const client = await getDocumentClient();
  await client.send(
    new lib.DeleteCommand({
      TableName: env.DYNAMODB_TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
  );
}

export async function queryByPk(pk: string, skPrefix?: string): Promise<DynamoItem[]> {
  const { lib } = await loadSdk();
  const client = await getDocumentClient();
  const res = (await client.send(
    new lib.QueryCommand({
      TableName: env.DYNAMODB_TABLE_NAME,
      KeyConditionExpression: skPrefix ? 'PK = :pk AND begins_with(SK, :sk)' : 'PK = :pk',
      ExpressionAttributeValues: skPrefix ? { ':pk': pk, ':sk': skPrefix } : { ':pk': pk },
    })
  )) as { Items?: DynamoItem[] };
  return res.Items ?? [];
}

export async function queryGsi(
  indexName: string,
  pkName: string,
  pkValue: string,
  skName?: string,
  skValue?: string
): Promise<DynamoItem[]> {
  const { lib } = await loadSdk();
  const client = await getDocumentClient();
  const res = (await client.send(
    new lib.QueryCommand({
      TableName: env.DYNAMODB_TABLE_NAME,
      IndexName: indexName,
      KeyConditionExpression:
        skName && skValue ? `${pkName} = :pk AND ${skName} = :sk` : `${pkName} = :pk`,
      ExpressionAttributeValues:
        skName && skValue ? { ':pk': pkValue, ':sk': skValue } : { ':pk': pkValue },
    })
  )) as { Items?: DynamoItem[] };
  return res.Items ?? [];
}

export function stripKeys<T>(item: DynamoItem): T {
  const {
    PK: _pk,
    SK: _sk,
    GSI1PK: _gsi1pk,
    GSI1SK: _gsi1sk,
    GSI2PK: _gsi2pk,
    GSI2SK: _gsi2sk,
    GSI3PK: _gsi3pk,
    GSI3SK: _gsi3sk,
    entityType: _entityType,
    ...rest
  } = item;
  return rest as T;
}
