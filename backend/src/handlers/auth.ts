import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { authService } from '../services/auth.service.js';
import { SignUpSchema, LoginSchema } from '../validators/profile.validator.js';
import { ok, created } from '../utils/response.js';

export const signUpHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = parseJsonBody(event);
    const validated = SignUpSchema.parse(body);

    const res = await authService.signUp(validated);
    return created(res);
  }
);

export const loginHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = parseJsonBody(event);
    const validated = LoginSchema.parse(body);

    const res = await authService.login(validated);
    return ok(res);
  }
);
