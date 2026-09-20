import type { APIGatewayProxyEvent, APIGatewayProxyResult } from './types/aws.js';
import {
  compileRoutes,
  matchRoute,
  normalizePath,
  withPathParameters,
} from './http/router.js';
import { errorResponse, noContent } from './utils/response.js';

import { healthHandler } from './handlers/health.js';
import {
  searchHospitalsHandler,
  getHospitalDetailsHandler,
  getDepartmentsHandler,
  getDepartmentDetailsHandler,
  getDoctorsHandler,
  getLabTestsHandler,
  getDoctorAvailabilityHandler,
} from './handlers/hospitals.js';
import { hospitalChatHandler, patientChatHandler } from './handlers/chatbot.js';
import {
  submitSymptomsHandler,
  getDiagnosisQuestionsHandler,
  getDiagnosisResultHandler,
} from './handlers/diagnosis.js';
import { signUpHandler, loginHandler } from './handlers/auth.js';
import { getProfileHandler, updateProfileHandler } from './handlers/profile.js';
import {
  createAppointmentHandler,
  listPatientAppointmentsHandler,
  getAppointmentDetailHandler,
} from './handlers/appointments.js';
import {
  listHospitalAppointmentsHandler,
  updateAppointmentStatusHandler,
} from './handlers/admin-appointments.js';
import {
  generatePrescriptionUploadUrlHandler,
  processPrescriptionHandler,
  confirmPrescriptionHandler,
  listPrescriptionsHandler,
  getPrescriptionDetailHandler,
  updatePrescriptionStatusHandler,
} from './handlers/prescriptions.js';
import {
  generateReportUploadUrlHandler,
  processReportHandler,
  confirmReportHandler,
  listReportsHandler,
  getReportDetailHandler,
} from './handlers/reports.js';
import { listOngoingMedicationsHandler } from './handlers/medications.js';
import {
  listCalendarEventsHandler,
  createCalendarEventHandler,
  updateCalendarEventHandler,
  deleteCalendarEventHandler,
} from './handlers/calendar.js';
import {
  adminCreateHospitalHandler,
  adminListHospitalsHandler,
  adminGetHospitalHandler,
  adminUpdateHospitalHandler,
  adminDeleteHospitalHandler,
  adminCreateDepartmentHandler,
  adminListDepartmentsHandler,
  adminUpdateDepartmentHandler,
  adminDeleteDepartmentHandler,
  adminCreateDoctorHandler,
  adminListDoctorsHandler,
  adminUpdateDoctorHandler,
  adminDeleteDoctorHandler,
  adminCreateScheduleHandler,
  adminUpdateScheduleHandler,
  adminDeleteScheduleHandler,
  adminCreateLabTestHandler,
  adminUpdateLabTestHandler,
  adminDeleteLabTestHandler,
} from './handlers/admin.js';

const compiledRoutes = compileRoutes([
  { method: 'GET', pattern: '/', handler: healthHandler },
  { method: 'GET', pattern: '/health', handler: healthHandler },

  { method: 'GET', pattern: '/hospitals/:hospitalId/doctors/:doctorId/availability', handler: getDoctorAvailabilityHandler },
  { method: 'GET', pattern: '/hospitals/:hospitalId/doctors', handler: getDoctorsHandler },
  { method: 'GET', pattern: '/hospitals/:hospitalId/labs', handler: getLabTestsHandler },
  { method: 'GET', pattern: '/hospitals/:hospitalId/departments/:departmentId', handler: getDepartmentDetailsHandler },
  { method: 'GET', pattern: '/hospitals/:hospitalId/departments', handler: getDepartmentsHandler },
  { method: 'GET', pattern: '/hospitals/:hospitalId', handler: getHospitalDetailsHandler },
  { method: 'GET', pattern: '/hospitals', handler: searchHospitalsHandler },

  { method: 'POST', pattern: '/chatbot/hospital', handler: hospitalChatHandler },
  { method: 'POST', pattern: '/chatbot/patient', handler: patientChatHandler },

  { method: 'POST', pattern: '/diagnosis/symptom', handler: submitSymptomsHandler },
  { method: 'GET', pattern: '/diagnosis/question', handler: getDiagnosisQuestionsHandler },
  { method: 'POST', pattern: '/diagnosis/result', handler: getDiagnosisResultHandler },

  { method: 'POST', pattern: '/auth/signup', handler: signUpHandler },
  { method: 'POST', pattern: '/auth/login', handler: loginHandler },
  { method: 'GET', pattern: '/profile', handler: getProfileHandler },
  { method: 'PUT', pattern: '/profile', handler: updateProfileHandler },

  { method: 'POST', pattern: '/appointments', handler: createAppointmentHandler },
  { method: 'GET', pattern: '/appointments/:appointmentId', handler: getAppointmentDetailHandler },
  { method: 'GET', pattern: '/appointments', handler: listPatientAppointmentsHandler },
  { method: 'GET', pattern: '/admin/appointments', handler: listHospitalAppointmentsHandler },
  { method: 'PATCH', pattern: '/admin/appointments/:appointmentId', handler: updateAppointmentStatusHandler },

  { method: 'POST', pattern: '/prescriptions/upload-url', handler: generatePrescriptionUploadUrlHandler },
  { method: 'POST', pattern: '/prescriptions/:prescriptionId/process', handler: processPrescriptionHandler },
  { method: 'PATCH', pattern: '/prescriptions/:prescriptionId/confirm', handler: confirmPrescriptionHandler },
  { method: 'PATCH', pattern: '/prescriptions/:prescriptionId/status', handler: updatePrescriptionStatusHandler },
  { method: 'GET', pattern: '/prescriptions/:prescriptionId', handler: getPrescriptionDetailHandler },
  { method: 'GET', pattern: '/prescriptions', handler: listPrescriptionsHandler },

  { method: 'POST', pattern: '/reports/upload-url', handler: generateReportUploadUrlHandler },
  { method: 'POST', pattern: '/reports/:reportId/process', handler: processReportHandler },
  { method: 'PATCH', pattern: '/reports/:reportId/confirm', handler: confirmReportHandler },
  { method: 'GET', pattern: '/reports/:reportId', handler: getReportDetailHandler },
  { method: 'GET', pattern: '/reports', handler: listReportsHandler },

  { method: 'GET', pattern: '/medications', handler: listOngoingMedicationsHandler },
  { method: 'GET', pattern: '/calendar', handler: listCalendarEventsHandler },
  { method: 'POST', pattern: '/calendar', handler: createCalendarEventHandler },
  { method: 'PUT', pattern: '/calendar/:eventId', handler: updateCalendarEventHandler },
  { method: 'DELETE', pattern: '/calendar/:eventId', handler: deleteCalendarEventHandler },

  { method: 'POST', pattern: '/admin/hospitals', handler: adminCreateHospitalHandler },
  { method: 'GET', pattern: '/admin/hospitals/:hospitalId', handler: adminGetHospitalHandler },
  { method: 'GET', pattern: '/admin/hospitals', handler: adminListHospitalsHandler },
  { method: 'PUT', pattern: '/admin/hospitals/:hospitalId', handler: adminUpdateHospitalHandler },
  { method: 'DELETE', pattern: '/admin/hospitals/:hospitalId', handler: adminDeleteHospitalHandler },

  { method: 'POST', pattern: '/admin/departments', handler: adminCreateDepartmentHandler },
  { method: 'GET', pattern: '/admin/departments', handler: adminListDepartmentsHandler },
  { method: 'PUT', pattern: '/admin/departments/:departmentId', handler: adminUpdateDepartmentHandler },
  { method: 'DELETE', pattern: '/admin/departments/:departmentId', handler: adminDeleteDepartmentHandler },

  { method: 'POST', pattern: '/admin/doctors', handler: adminCreateDoctorHandler },
  { method: 'GET', pattern: '/admin/doctors', handler: adminListDoctorsHandler },
  { method: 'PUT', pattern: '/admin/doctors/:doctorId', handler: adminUpdateDoctorHandler },
  { method: 'DELETE', pattern: '/admin/doctors/:doctorId', handler: adminDeleteDoctorHandler },

  { method: 'POST', pattern: '/admin/schedules', handler: adminCreateScheduleHandler },
  { method: 'PUT', pattern: '/admin/schedules/:scheduleId', handler: adminUpdateScheduleHandler },
  { method: 'DELETE', pattern: '/admin/schedules/:scheduleId', handler: adminDeleteScheduleHandler },

  { method: 'POST', pattern: '/admin/labs', handler: adminCreateLabTestHandler },
  { method: 'PUT', pattern: '/admin/labs/:labId', handler: adminUpdateLabTestHandler },
  { method: 'DELETE', pattern: '/admin/labs/:labId', handler: adminDeleteLabTestHandler },
]);

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod.toUpperCase();
  const path = normalizePath(event.path);

  if (method === 'OPTIONS') {
    return noContent();
  }

  const matched = matchRoute(compiledRoutes, method, path);
  if (!matched) {
    return errorResponse(404, 'NOT_FOUND', 'Route not found');
  }

  return matched.handler(withPathParameters(event, matched.pathParameters));
}
