import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/aws.js';
import { withErrorHandler } from '../middleware/error.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { parseJsonBody } from '../middleware/request.middleware.js';
import { recordService } from '../services/record.service.js';
import {
  GenerateUploadUrlSchema,
  ConfirmReportSchema,
  ReportIdParamSchema,
} from '../validators/record.validator.js';
import { ok, created } from '../utils/response.js';

export const generateReportUploadUrlHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const body = parseJsonBody(event);
    const validated = GenerateUploadUrlSchema.parse(body);

    const res = await recordService.generateReportUploadUrl(auth, validated);
    return created(res);
  }
);

export const processReportHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { reportId } = ReportIdParamSchema.parse(event.pathParameters || {});

    const report = await recordService.processReport(auth, reportId);
    return ok(report);
  }
);

export const confirmReportHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { reportId } = ReportIdParamSchema.parse(event.pathParameters || {});
    const body = parseJsonBody(event);
    const validated = ConfirmReportSchema.parse(body);

    const confirmed = await recordService.confirmReport(auth, reportId, validated);
    return ok(confirmed);
  }
);

export const listReportsHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const reports = await recordService.listReports(auth);
    return ok(reports);
  }
);

export const getReportDetailHandler = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const auth = requireRole(event, ['patient']);
    const { reportId } = ReportIdParamSchema.parse(event.pathParameters || {});

    const report = await recordService.getReport(auth, reportId);
    return ok(report);
  }
);
