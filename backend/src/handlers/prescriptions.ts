import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { recordService } from '../services/record.service.js';
import {
  GenerateUploadUrlSchema,
  ConfirmPrescriptionSchema,
  PrescriptionIdParamSchema,
} from '../validators/record.validator.js';
import { ok, created } from '../utils/response.js';

export const generatePrescriptionUploadUrlHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const body = parseJsonBody(event);
    const validated = GenerateUploadUrlSchema.parse(body);

    const res = await recordService.generatePrescriptionUploadUrl(auth, validated);
    return created(res);
  }
);

export const processPrescriptionHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { prescriptionId } = PrescriptionIdParamSchema.parse(event.pathParameters || {});

    const prescription = await recordService.processPrescription(auth, prescriptionId);
    return ok(prescription);
  }
);

export const confirmPrescriptionHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { prescriptionId } = PrescriptionIdParamSchema.parse(event.pathParameters || {});
    const body = parseJsonBody(event);
    const validated = ConfirmPrescriptionSchema.parse(body);

    const confirmed = await recordService.confirmPrescription(auth, prescriptionId, validated);
    return ok(confirmed);
  }
);

export const listPrescriptionsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const prescriptions = await recordService.listPrescriptions(auth);
    return ok(prescriptions);
  }
);

export const getPrescriptionDetailHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { prescriptionId } = PrescriptionIdParamSchema.parse(event.pathParameters || {});

    const prescription = await recordService.getPrescription(auth, prescriptionId);
    return ok(prescription);
  }
);

export const updatePrescriptionStatusHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { prescriptionId } = PrescriptionIdParamSchema.parse(event.pathParameters || {});
    const body = parseJsonBody(event);
    const { UpdatePrescriptionStatusSchema } = await import('../validators/record.validator.js');
    const validated = UpdatePrescriptionStatusSchema.parse(body);

    const updated = await recordService.updatePrescriptionStatus(
      auth,
      prescriptionId,
      validated.treatmentStatus
    );
    return ok(updated);
  }
);
