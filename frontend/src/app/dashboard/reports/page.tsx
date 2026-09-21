'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
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
  Eye,
  Check,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicalDisclaimer } from '@/components/common/medical-disclaimer';
import { reportsApi } from '@/lib/api/reports';
import { useToast } from '@/contexts/toast-context';
import { MedicalReport, Finding } from '@/types';
import { formatDate } from '@/lib/utils';

export default function ReportsPage() {
  const toast = useToast();

  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'draft'>('all');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);

  // Review / Confirm Modal State
  const [activeReviewReport, setActiveReviewReport] = useState<MedicalReport | null>(null);
  const [title, setTitle] = useState('');
  const [testType, setTestType] = useState('');
  const [labName, setLabName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await reportsApi.listReports();
      setReports(list || []);
    } catch (err: unknown) {
      toast.error('Failed to load medical reports');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Open review modal
  const handleOpenReview = (report: MedicalReport) => {
    setActiveReviewReport(report);
    setTitle(report.title || 'Diagnostic Test Report');
    setTestType(report.testType || 'Pathology Panel');
    setLabName(report.labName || '');
    setDoctorName(report.doctorName || '');
    setHospitalName(report.hospitalName || '');
    setReportDate(report.reportDate || new Date().toISOString().split('T')[0]);
    setSummary(report.summary || '');
    setNotes(report.notes || '');
    setFindings(
      report.findings?.length
        ? [...report.findings]
        : [
            {
              parameter: 'Hemoglobin',
              value: '14.2',
              unit: 'g/dL',
              referenceRange: '13.0 - 17.0',
              status: 'normal',
            },
          ]
    );
  };

  // Upload handler with presigned S3 URL + Textract OCR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    setUploadProgressMsg('Requesting secure presigned S3 upload slot...');

    try {
      // Step 1: Request presigned S3 upload URL
      const uploadData = await reportsApi.generateUploadUrl(file.name, file.type, file.size);

      // Step 2: Upload directly to S3
      setUploadProgressMsg('Uploading report securely to S3 bucket...');
      await reportsApi.uploadFileToS3(uploadData.uploadUrl, file);

      // Step 3: Trigger Textract OCR & Bedrock report extraction
      setUploadProgressMsg('Running Textract OCR & extracting clinical parameters...');
      let processedReport: MedicalReport | null = null;
      try {
        processedReport = await reportsApi.processReport(uploadData.recordId);
        toast.success('Medical report parsed! Please review the extracted findings.');
      } catch (procErr: unknown) {
        console.warn('Report OCR/Bedrock processing deferred or pending:', procErr);
        toast.info('Report uploaded securely to S3. Please confirm parameters below.');
        processedReport = {
          reportId: uploadData.recordId,
          patientId: '',
          s3Key: uploadData.s3Key,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          status: 'draft',
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          testType: 'Diagnostic Pathology Panel',
          findings: [
            {
              parameter: 'Clinical Parameter',
              value: 'Normal',
              unit: '',
              status: 'normal',
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      await fetchReports();

      // Open review modal for human verification
      if (processedReport) {
        handleOpenReview(processedReport);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Medical report upload failed';
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg(null);
    }
  };

  // Confirm report
  const handleConfirmReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewReport) return;

    if (!title.trim()) {
      toast.error('Report title is required.');
      return;
    }

    if (!findings.length || findings.some((f) => !f.parameter.trim() || !f.value.trim())) {
      toast.error('Please specify valid parameter name and value for each finding.');
      return;
    }

    setIsConfirming(true);
    try {
      await reportsApi.confirmReport(activeReviewReport.reportId, {
        title: title.trim(),
        testType: testType.trim() || undefined,
        labName: labName.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        hospitalName: hospitalName.trim() || undefined,
        reportDate: reportDate || undefined,
        summary: summary.trim() || undefined,
        notes: notes.trim() || undefined,
        findings: findings.map((f) => ({
          parameter: f.parameter.trim(),
          value: f.value.trim(),
          unit: f.unit?.trim() || undefined,
          referenceRange: f.referenceRange?.trim() || undefined,
          status: f.status,
          notes: f.notes?.trim() || undefined,
        })),
      });

      toast.success('Medical report confirmed and saved to your health record.');
      setActiveReviewReport(null);
      await fetchReports();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm report';
      toast.error(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  // Finding row modifiers
  const handleAddFindingRow = () => {
    setFindings((prev) => [
      ...prev,
      { parameter: '', value: '', unit: '', referenceRange: '', status: 'normal' },
    ]);
  };

  const handleRemoveFindingRow = (index: number) => {
    setFindings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFindingChange = (index: number, field: keyof Finding, value: any) => {
    setFindings((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  };

  const filteredReports = reports.filter((r) => {
    if (filter === 'confirmed') return r.status === 'confirmed';
    if (filter === 'draft') return r.status === 'draft';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600">
            <FlaskConical className="w-4 h-4" />
            <span>Diagnostics & Lab Records</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Medical Reports & Findings
          </h1>
          <p className="text-xs text-slate-500">
            Upload blood work, pathology tests, or radiological scans for automatic parameter extraction.
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
              <span>{isUploading ? 'Processing...' : 'Upload Medical Report'}</span>
            </Button>
          </label>
        </div>
      </div>

      {/* Upload Progress Banner */}
      {isUploading && uploadProgressMsg && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
          <div>
            <p className="font-bold">Automated OCR & Clinical Extraction Active</p>
            <p className="text-teal-700 mt-0.5">{uploadProgressMsg}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['all', 'confirmed', 'draft'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f} ({reports.filter((r) => f === 'all' || r.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* Report List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <FlaskConical className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No medical reports found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload lab scans (PDF or image) to extract and track test parameters over time.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((rep) => {
            const isDraft = rep.status === 'draft';
            const abnormalCount = rep.findings?.filter((f) => f.status !== 'normal').length || 0;

            return (
              <Card
                key={rep.reportId}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isDraft ? 'warning' : 'success'}>
                      {isDraft ? 'DRAFT (REQUIRES REVIEW)' : 'CONFIRMED'}
                    </Badge>
                    {rep.testType && <Badge variant="outline">{rep.testType}</Badge>}
                    <span className="text-xs text-slate-400">
                      File: <strong>{rep.fileName}</strong>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{rep.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-0.5">
                      {rep.labName && (
                        <span>
                          Lab: <strong>{rep.labName}</strong>
                        </span>
                      )}
                      {rep.doctorName && (
                        <span>
                          Doctor: <strong>{rep.doctorName}</strong>
                        </span>
                      )}
                      {rep.hospitalName && (
                        <span>
                          Hospital: <strong>{rep.hospitalName}</strong>
                        </span>
                      )}
                    </div>
                    {rep.notes && (
                      <p className="text-xs text-slate-500 italic mt-0.5">
                        <strong>Notes:</strong> {rep.notes}
                      </p>
                    )}
                  </div>

                  {/* Findings snapshot */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-slate-600 font-medium">
                      {rep.findings?.length || 0} parameter(s) recorded
                    </span>
                    {abnormalCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                        {abnormalCount} abnormal value(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t md:border-t-0 pt-3 md:pt-0 shrink-0 flex md:flex-col items-center md:items-end justify-between gap-2">
                  <div className="text-left md:text-right text-xs text-slate-500">
                    <span className="block font-semibold text-slate-800">
                      {formatDate(rep.reportDate || rep.createdAt)}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={isDraft ? 'primary' : 'outline'}
                    onClick={() => handleOpenReview(rep)}
                    className="gap-1.5 text-xs h-9 font-semibold"
                  >
                    {isDraft ? <Check className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{isDraft ? 'Review & Confirm' : 'View Findings'}</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation & Human Verification Modal */}
      <Modal
        isOpen={!!activeReviewReport}
        onClose={() => setActiveReviewReport(null)}
        title={activeReviewReport?.status === 'draft' ? 'Review Extracted Medical Report' : 'Report Details'}
        description="Verify diagnostic test parameters, reference intervals, and clinical notes."
        maxWidth="4xl"
      >
        <form onSubmit={handleConfirmReport} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Report Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete Blood Count (CBC)"
              required
            />
            <Input
              label="Test Type / Category"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              placeholder="Hematology, Biochemistry"
            />
            <Input
              label="Diagnostic Lab / Hospital"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="Sharda Diagnostic Center"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Referring / Attending Doctor"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. S. K. Sharma"
            />
            <Input
              label="Hospital / Clinic Name"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder="Sharda Hospital"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Report Date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
            <Input
              label="Clinical Summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of test findings..."
            />
            <Input
              label="Physician Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dietary follow-up recommended"
            />
          </div>

          {/* Findings Table Editor */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Extracted Parameters & Findings ({findings.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFindingRow}
                className="gap-1 text-xs h-7"
              >
                <Plus className="w-3 h-3" />
                <span>Add Parameter</span>
              </Button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {findings.map((finding, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                >
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Parameter (e.g. Platelets)"
                      value={finding.parameter}
                      onChange={(e) => handleFindingChange(idx, 'parameter', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Value (250)"
                      value={finding.value}
                      onChange={(e) => handleFindingChange(idx, 'value', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Unit (10^3/uL)"
                      value={finding.unit || ''}
                      onChange={(e) => handleFindingChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Ref (150 - 450)"
                      value={finding.referenceRange || ''}
                      onChange={(e) => handleFindingChange(idx, 'referenceRange', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={finding.status}
                      onChange={(e) => handleFindingChange(idx, 'status', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                      <option value="abnormal">Abnormal</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveFindingRow(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove row"
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
              Confirmed findings become available to your Personal Health AI Assistant.
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveReviewReport(null)}
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
                <span>Confirm Report</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <MedicalDisclaimer />
    </div>
  );
}
