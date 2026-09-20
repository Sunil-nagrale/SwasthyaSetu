import { apiClient } from './client';
import { Prescription, Medicine } from '@/types';

export interface UploadUrlResponse {
  uploadUrl: string;
  recordId: string;
  s3Key: string;
  expiresInSeconds: number;
}

export interface ConfirmPrescriptionPayload {
  doctorName?: string;
  hospitalName?: string;
  prescriptionDate?: string;
  diagnosis?: string;
  treatmentStatus?: 'ongoing' | 'completed' | 'cured';
  notes?: string;
  medicines: Medicine[];
}

export const prescriptionsApi = {
  async generateUploadUrl(fileName: string, mimeType: string, fileSize: number): Promise<UploadUrlResponse> {
    return apiClient<UploadUrlResponse>('/prescriptions/upload-url', {
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
      throw new Error(`Failed to upload file to S3 (${res.status} ${res.statusText})`);
    }
  },

  async processPrescription(prescriptionId: string): Promise<Prescription> {
    return apiClient<Prescription>(`/prescriptions/${prescriptionId}/process`, {
      method: 'POST',
    });
  },

  async confirmPrescription(prescriptionId: string, payload: ConfirmPrescriptionPayload): Promise<Prescription> {
    return apiClient<Prescription>(`/prescriptions/${prescriptionId}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(prescriptionId: string, treatmentStatus: 'ongoing' | 'completed' | 'cured'): Promise<Prescription> {
    return apiClient<Prescription>(`/prescriptions/${prescriptionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ treatmentStatus }),
    });
  },

  async listPrescriptions(): Promise<Prescription[]> {
    return apiClient<Prescription[]>('/prescriptions');
  },

  async getPrescriptionById(prescriptionId: string): Promise<Prescription> {
    return apiClient<Prescription>(`/prescriptions/${prescriptionId}`);
  },
};
