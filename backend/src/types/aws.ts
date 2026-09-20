export interface APIGatewayProxyEventHeaders {
  [name: string]: string | undefined;
}

export interface APIGatewayProxyEventQueryStringParameters {
  [name: string]: string | undefined;
}

export interface APIGatewayProxyEventPathParameters {
  [name: string]: string | undefined;
}

export interface APIGatewayAuthorizerClaims {
  sub?: string;
  email?: string;
  'cognito:groups'?: string | string[];
  'custom:role'?: string;
  [name: string]: unknown;
}

export interface APIGatewayEventRequestContext {
  accountId?: string;
  apiId?: string;
  httpMethod: string;
  path: string;
  requestId: string;
  stage?: string;
  authorizer?: {
    claims?: APIGatewayAuthorizerClaims;
    [name: string]: unknown;
  };
}

export interface APIGatewayProxyEvent {
  body: string | null;
  headers: APIGatewayProxyEventHeaders;
  multiValueHeaders?: { [name: string]: string[] | undefined };
  httpMethod: string;
  isBase64Encoded: boolean;
  path: string;
  pathParameters: APIGatewayProxyEventPathParameters | null;
  queryStringParameters: APIGatewayProxyEventQueryStringParameters | null;
  multiValueQueryStringParameters?: { [name: string]: string[] | undefined };
  stageVariables?: { [name: string]: string | undefined } | null;
  requestContext: APIGatewayEventRequestContext;
  resource?: string;
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers?: {
    [header: string]: boolean | number | string;
  };
  multiValueHeaders?: {
    [header: string]: Array<boolean | number | string>;
  };
  body: string;
  isBase64Encoded?: boolean;
}

export type APIGatewayProxyHandler = (
  event: APIGatewayProxyEvent
) => Promise<APIGatewayProxyResult>;
