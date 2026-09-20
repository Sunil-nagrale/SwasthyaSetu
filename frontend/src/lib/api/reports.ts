import { apiClient } from './client';
import { MedicalReport, Finding } from '@/types';
import { UploadUrlResponse } from './prescriptions';

export interface ConfirmReportPayload {
  title: string;
  testType?: string;
  labName?: string;
  doctorName?: string;
  hospitalName?: string;
  reportDate?: string;
  findings: Finding[];
  summary?: string;
  notes?: string;
}

export const reportsApi = {
  async generateUploadUrl(fileName: string, mimeType: string, fileSize: number): Promise<UploadUrlResponse> {
    return apiClient<UploadUrlResponse>('/reports/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, mimeType, fileSize }),
    });
  },

  async uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
    if (uploadUrl.includes('mock-region') || uploadUrl.includes('mock-signature') || uploadUrl.includes('mock-bucket')) {
      // In local mock mode, pre-signed S3 URL points to synthetic mock domain; skip browser network call
      return;
    }
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Failed to upload report file to S3 (${res.status} ${res.statusText})`);
    }
  },

  async processReport(reportId: string): Promise<MedicalReport> {
    return apiClient<MedicalReport>(`/reports/${reportId}/process`, {
      method: 'POST',
    });
  },

  async confirmReport(reportId: string, payload: ConfirmReportPayload): Promise<MedicalReport> {
    return apiClient<MedicalReport>(`/reports/${reportId}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async listReports(): Promise<MedicalReport[]> {
    return apiClient<MedicalReport[]>('/reports');
  },

  async getReportById(reportId: string): Promise<MedicalReport> {
    return apiClient<MedicalReport>(`/reports/${reportId}`);
  },
};
