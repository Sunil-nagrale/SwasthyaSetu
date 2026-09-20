import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { profileService } from '../services/profile.service.js';
import { UpdateProfileSchema } from '../validators/profile.validator.js';
import { ok } from '../utils/response.js';

export const getProfileHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const profile = await profileService.getProfile(auth);
    return ok(profile);
  }
);

export const updateProfileHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const body = parseJsonBody(event);
    const validated = UpdateProfileSchema.parse(body);

    const updated = await profileService.updateProfile(auth, validated);
    return ok(updated);
  }
);
