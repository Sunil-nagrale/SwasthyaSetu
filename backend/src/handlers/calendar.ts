import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { calendarService } from '../services/calendar.service.js';
import {
  CreateCalendarEventSchema,
  UpdateCalendarEventSchema,
  EventIdParamSchema,
} from '../validators/calendar.validator.js';
import { ok, created, noContent } from '../utils/response.js';

export const listCalendarEventsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const events = await calendarService.listEvents(auth);
    return ok(events);
  }
);

export const createCalendarEventHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const body = parseJsonBody(event);
    const validated = CreateCalendarEventSchema.parse(body);

    const createdEvent = await calendarService.createEvent(auth, validated);
    return created(createdEvent);
  }
);

export const updateCalendarEventHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { eventId } = EventIdParamSchema.parse(event.pathParameters || {});
    const body = parseJsonBody(event);
    const validated = UpdateCalendarEventSchema.parse(body);

    const updated = await calendarService.updateEvent(auth, eventId, validated);
    return ok(updated);
  }
);

export const deleteCalendarEventHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { eventId } = EventIdParamSchema.parse(event.pathParameters || {});

    await calendarService.deleteEvent(auth, eventId);
    return noContent();
  }
);
