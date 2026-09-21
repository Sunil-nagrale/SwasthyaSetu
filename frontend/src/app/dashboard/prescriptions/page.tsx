'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  Calendar,
  Building2,
  User,
  Eye,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicalDisclaimer } from '@/components/common/medical-disclaimer';
import { prescriptionsApi } from '@/lib/api/prescriptions';
import { useToast } from '@/contexts/toast-context';
import { Prescription, Medicine } from '@/types';
import { formatDate } from '@/lib/utils';

export default function PrescriptionsPage() {
  const toast = useToast();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed' | 'draft'>('all');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);

  // Review / Confirm Modal State
  const [activeReviewRx, setActiveReviewRx] = useState<Prescription | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentStatus, setTreatmentStatus] = useState<'ongoing' | 'completed' | 'cured'>('ongoing');
  const [notes, setNotes] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await prescriptionsApi.listPrescriptions();
      setPrescriptions(list || []);
    } catch (err: unknown) {
      toast.error('Failed to load prescriptions');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // Toggle treatment status directly
  const handleToggleStatus = async (
    rx: Prescription,
    newStatus: 'ongoing' | 'completed' | 'cured'
  ) => {
    setIsUpdatingStatus(rx.prescriptionId);
    try {
      await prescriptionsApi.updateStatus(rx.prescriptionId, newStatus);
      toast.success(
        newStatus === 'ongoing'
          ? 'Treatment reactivated and medication schedule synced.'
          : `Treatment marked as ${newStatus}. Medication schedule updated.`
      );
      await fetchPrescriptions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update treatment status';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Open confirmation modal
  const handleOpenReview = (rx: Prescription) => {
    setActiveReviewRx(rx);
    setDoctorName(rx.doctorName || '');
    setHospitalName(rx.hospitalName || '');
    setPrescriptionDate(rx.prescriptionDate || new Date().toISOString().split('T')[0]);
    setDiagnosis(rx.diagnosis || '');
    setTreatmentStatus(rx.treatmentStatus || 'ongoing');
    setNotes(rx.notes || '');
    setMedicines(
      rx.medicines?.length
        ? [...rx.medicines]
        : [{ name: '', dosage: '', frequency: 'Once daily', duration: '7 days', instructions: 'After meals' }]
    );
  };

  // Upload handler with AWS S3 Presigned URL + Textract OCR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be chosen again if needed
    e.target.value = '';

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size cannot exceed 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgressMsg('Generating secure presigned upload slot...');

    try {
      // Step 1: Request presigned S3 upload URL from backend
      const uploadData = await prescriptionsApi.generateUploadUrl(file.name, file.type, file.size);

      // Step 2: Upload directly to S3
      setUploadProgressMsg('Uploading document securely to S3 storage...');
      await prescriptionsApi.uploadFileToS3(uploadData.uploadUrl, file);

      // Step 3: Trigger Textract OCR & Bedrock clinical extraction
      setUploadProgressMsg('Running Textract OCR & clinical medicine extraction...');
      let processedRx: Prescription | null = null;
      try {
        processedRx = await prescriptionsApi.processPrescription(uploadData.recordId);
        toast.success('Prescription scanned! Please review extracted medicines.');
      } catch (procErr: unknown) {
        console.warn('Prescription OCR/Bedrock processing deferred or pending:', procErr);
        toast.info('Document uploaded securely to S3. Please confirm details below.');
        processedRx = {
          prescriptionId: uploadData.recordId,
          patientId: '',
          s3Key: uploadData.s3Key,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          status: 'draft',
          treatmentStatus: 'ongoing',
          medicines: [{ name: '', dosage: '', frequency: 'Once daily', duration: '7 days', instructions: 'After meals' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      await fetchPrescriptions();

      // Open review modal immediately for human verification
      if (processedRx) {
        handleOpenReview(processedRx);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Prescription upload failed';
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg(null);
    }
  };

  // Confirm prescription
  const handleConfirmPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewRx) return;

    if (!medicines.length || medicines.some((m) => !m.name.trim() || !m.dosage.trim())) {
      toast.error('Please specify valid medicine name and dosage for each item.');
      return;
    }

    setIsConfirming(true);
    try {
      await prescriptionsApi.confirmPrescription(activeReviewRx.prescriptionId, {
        doctorName: doctorName.trim() || undefined,
        hospitalName: hospitalName.trim() || undefined,
        prescriptionDate: prescriptionDate || undefined,
        diagnosis: diagnosis.trim() || undefined,
        treatmentStatus,
        notes: notes.trim() || undefined,
        medicines: medicines.map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration?.trim() || undefined,
          instructions: m.instructions?.trim() || undefined,
        })),
      });

      toast.success(
        treatmentStatus === 'ongoing'
          ? 'Prescription confirmed! Medication reminders active on calendar.'
          : 'Prescription confirmed as completed course.'
      );
      setActiveReviewRx(null);
      await fetchPrescriptions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm prescription';
      toast.error(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  // Medicine row modifiers
  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      { name: '', dosage: '500mg', frequency: 'Twice daily', duration: '5 days', instructions: 'After meals' },
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index: number, field: keyof Medicine, value: string) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (filter === 'ongoing') {
      return p.status === 'confirmed' && p.treatmentStatus !== 'completed' && p.treatmentStatus !== 'cured';
    }
    if (filter === 'completed') {
      return p.status === 'confirmed' && (p.treatmentStatus === 'completed' || p.treatmentStatus === 'cured');
    }
    if (filter === 'draft') {
      return p.status === 'draft';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600">
            <FileText className="w-4 h-4" />
            <span>Digital Prescriptions</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Prescriptions & OCR Records
          </h1>
          <p className="text-xs text-slate-500">
            Upload scans of prescriptions for automated Textract OCR medicine extraction.
          </p>
        </div>

        {/* Upload Button */}
        <div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              type="button"
              disabled={isUploading}
              className="gap-2 text-xs font-semibold pointer-events-none"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{isUploading ? 'Processing...' : 'Upload Prescription Scan'}</span>
            </Button>
          </label>
        </div>
      </div>

      {/* Upload Progress Banner */}
      {isUploading && uploadProgressMsg && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
          <div>
            <p className="font-bold">Automated OCR Extraction In Progress</p>
            <p className="text-teal-700 mt-0.5">{uploadProgressMsg}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['all', 'ongoing', 'completed', 'draft'] as const).map((f) => {
            const count = prescriptions.filter((p) => {
              if (f === 'all') return true;
              if (f === 'ongoing') return p.status === 'confirmed' && p.treatmentStatus !== 'completed' && p.treatmentStatus !== 'cured';
              if (f === 'completed') return p.status === 'confirmed' && (p.treatmentStatus === 'completed' || p.treatmentStatus === 'cured');
              if (f === 'draft') return p.status === 'draft';
              return true;
            }).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                  filter === f
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f === 'completed' ? 'Completed / Cured' : f} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Prescription List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No prescriptions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your prescription scans (PDF or image) to parse and sync active medications.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((rx) => {
            const isDraft = rx.status === 'draft';
            const isCompleted = rx.treatmentStatus === 'completed' || rx.treatmentStatus === 'cured';
            const isOngoing = rx.status === 'confirmed' && !isCompleted;
            const updatingThis = isUpdatingStatus === rx.prescriptionId;

            return (
              <Card
                key={rx.prescriptionId}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isDraft && (
                      <Badge variant="warning">DRAFT (NEEDS CONFIRMATION)</Badge>
                    )}
                    {isOngoing && (
                      <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        ONGOING TREATMENT
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge variant="default" className="bg-slate-100 text-slate-700 border-slate-300">
                        {rx.treatmentStatus === 'cured' ? 'CURED / RESOLVED' : 'COMPLETED COURSE'}
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400">
                      File: <strong>{rx.fileName}</strong>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {rx.doctorName || 'Doctor not specified'}
                      {rx.hospitalName ? ` • ${rx.hospitalName}` : ''}
                    </h3>
                    {rx.diagnosis && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        <strong>Diagnosis:</strong> {rx.diagnosis}
                      </p>
                    )}
                    {rx.notes && (
                      <p className="text-xs text-slate-500 italic mt-0.5">
                        <strong>Notes:</strong> {rx.notes}
                      </p>
                    )}
                  </div>

                  {/* Extracted medicines preview */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rx.medicines?.map((med, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2.5 py-0.5 rounded-md font-medium border ${
                          isCompleted
                            ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}
                      >
                        {med.name} ({med.dosage})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t md:border-t-0 pt-3 md:pt-0 shrink-0 flex md:flex-col items-center md:items-end justify-between gap-2.5">
                  <div className="text-left md:text-right text-xs text-slate-500">
                    <span className="block font-semibold text-slate-800">
                      {formatDate(rx.prescriptionDate || rx.createdAt)}
                    </span>
                    <span>{rx.medicines?.length || 0} medicine(s)</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {rx.status === 'confirmed' && (
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Status:</label>
                        <select
                          value={rx.treatmentStatus || 'ongoing'}
                          disabled={!!updatingThis}
                          onChange={(e) => handleToggleStatus(rx, e.target.value as any)}
                          className="text-xs py-1 px-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option>
                          <option value="cured">Cured</option>
                        </select>
                        {updatingThis && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant={isDraft ? 'primary' : 'outline'}
                      onClick={() => handleOpenReview(rx)}
                      className="gap-1.5 text-xs h-8 font-semibold"
                    >
                      {isDraft ? <Check className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isDraft ? 'Review & Confirm' : 'View Details'}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation & Human Verification Modal */}
      <Modal
        isOpen={!!activeReviewRx}
        onClose={() => setActiveReviewRx(null)}
        title={activeReviewRx?.status === 'draft' ? 'Review & Confirm Extracted Prescription' : 'Prescription Details'}
        description="Verify extracted medicines and clinical notes before synchronizing to ongoing medication schedule."
        maxWidth="2xl"
      >
        <form onSubmit={handleConfirmPrescription} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Doctor Name"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. S. K. Sharma"
            />
            <Input
              label="Hospital / Clinic"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder="Sharda Hospital"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Prescription Date"
              type="date"
              value={prescriptionDate}
              onChange={(e) => setPrescriptionDate(e.target.value)}
            />
            <Input
              label="Diagnosis / Chief Complaint"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Type 2 Diabetes, Hypertension"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1.5">
                Treatment Course Status
              </label>
              <select
                value={treatmentStatus}
                onChange={(e) => setTreatmentStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="ongoing">Ongoing Treatment (Active Reminders)</option>
                <option value="completed">Completed Course</option>
                <option value="cured">Cured / Resolved</option>
              </select>
            </div>
            <Input
              label="Doctor Notes & Instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Follow-up after 14 days, low sodium diet"
            />
          </div>

          {/* Medicines List Editor */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Prescribed Medicines ({medicines.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMedicineRow}
                className="gap-1 text-xs h-7"
              >
                <Plus className="w-3 h-3" />
                <span>Add Medicine</span>
              </Button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Metformin)"
                      value={med.name}
                      onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Dosage (500mg)"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Freq (Twice daily)"
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Duration (7 days)"
                      value={med.duration || ''}
                      onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicineRow(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Confirming automatically creates medication reminders on your calendar.
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveReviewRx(null)}
              >
                Close
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isConfirming}
                className="gap-1.5 font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Prescription</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <MedicalDisclaimer />
    </div>
  );
}
