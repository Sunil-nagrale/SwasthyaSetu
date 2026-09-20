import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';

export type RouteHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export interface RouteDefinition {
  method: string;
  pattern: string;
  handler: RouteHandler;
}

interface CompiledRoute {
  method: string;
  keys: string[];
  regex: RegExp;
  handler: RouteHandler;
}

export function normalizePath(path: string): string {
  const withoutQuery = path.split('?')[0] ?? path;
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed || '/';
}

function compilePattern(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withParams = escaped.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (_m, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${withParams}$`), keys };
}

export function compileRoutes(definitions: RouteDefinition[]): CompiledRoute[] {
  return definitions.map((def) => {
    const compiled = compilePattern(normalizePath(def.pattern));
    return {
      method: def.method.toUpperCase(),
      keys: compiled.keys,
      regex: compiled.regex,
      handler: def.handler,
    };
  });
}

export function matchRoute(
  routes: CompiledRoute[],
  method: string,
  path: string
): { handler: RouteHandler; pathParameters: Record<string, string> } | null {
  const normalized = normalizePath(path);
  const upper = method.toUpperCase();
  for (const route of routes) {
    if (route.method !== upper) continue;
    const match = normalized.match(route.regex);
    if (!match) continue;
    const pathParameters: Record<string, string> = {};
    route.keys.forEach((key, index) => {
      const value = match[index + 1];
      if (value) pathParameters[key] = decodeURIComponent(value);
    });
    return { handler: route.handler, pathParameters };
  }
  return null;
}

export function withPathParameters(
  event: APIGatewayProxyEvent,
  pathParameters: Record<string, string>
): APIGatewayProxyEvent {
  return {
    ...event,
    pathParameters: {
      ...(event.pathParameters ?? {}),
      ...pathParameters,
    },
  };
}
