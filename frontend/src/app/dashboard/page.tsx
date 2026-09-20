'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  FileText,
  FlaskConical,
  Pill,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { appointmentsApi } from '@/lib/api/appointments';
import { prescriptionsApi } from '@/lib/api/prescriptions';
import { reportsApi } from '@/lib/api/reports';
import { medicationsApi } from '@/lib/api/medications';
import { Appointment, Prescription, MedicalReport, OngoingMedication } from '@/types';
import { formatDate } from '@/lib/utils';

export default function PatientDashboardOverview() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [medications, setMedications] = useState<OngoingMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [apptsRes, rxRes, repRes, medsRes] = await Promise.allSettled([
          appointmentsApi.listPatientAppointments(),
          prescriptionsApi.listPrescriptions(),
          reportsApi.listReports(),
          medicationsApi.listOngoingMedications(),
        ]);

        if (apptsRes.status === 'fulfilled') {
          const val = apptsRes.value;
          setAppointments(Array.isArray(val) ? val : (val as any).items || []);
        }
        if (rxRes.status === 'fulfilled') {
          setPrescriptions(rxRes.value || []);
        }
        if (repRes.status === 'fulfilled') {
          setReports(repRes.value || []);
        }
        if (medsRes.status === 'fulfilled') {
          setMedications(medsRes.value || []);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'accepted' || a.status === 'pending'
  );
  const activeMedications = medications.filter((m) => m.isActive !== false);

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-primary-900 to-teal-800 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-teal-200 uppercase tracking-wider">
            Patient Health Records
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Personal Health Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-200">
            Securely manage verified appointments, OCR prescriptions, and clinical lab findings.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/dashboard/prescriptions">
            <Button size="sm" className="gap-1.5 bg-white text-primary-900 hover:bg-slate-100 font-bold">
              <Plus className="w-4 h-4" />
              <span>Upload Prescription</span>
            </Button>
          </Link>
          <Link href="/hospitals">
            <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10">
              <span>Book Doctor</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Upcoming Visits
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              {isLoading ? '...' : upcomingAppointments.length}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {appointments.filter((a) => a.status === 'pending').length} pending review
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Medications
            </span>
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              {isLoading ? '...' : activeMedications.length}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">Auto-synced to calendar</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Prescriptions
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              {isLoading ? '...' : prescriptions.length}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {prescriptions.filter((p) => p.status === 'confirmed').length} confirmed
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lab Reports
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              {isLoading ? '...' : reports.length}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {reports.filter((r) => r.status === 'confirmed').length} confirmed
            </span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Next Appointment + Recent Records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Appointments */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Consultation Appointments
            </h3>
            <Link
              href="/dashboard/appointments"
              className="text-xs text-primary-600 hover:underline font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <Skeleton className="h-36 w-full rounded-2xl" />
          ) : appointments.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No scheduled appointments found.</p>
              <Link href="/hospitals">
                <Button size="sm" variant="outline" className="text-xs">
                  Browse Hospitals to Book
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 3).map((appt) => (
                <Card key={appt.appointmentId} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          appt.status === 'accepted'
                            ? 'success'
                            : appt.status === 'pending'
                            ? 'warning'
                            : appt.status === 'canceled'
                            ? 'default'
                            : 'danger'
                        }
                      >
                        {appt.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-500 font-medium">
                        {appt.preferredDate} at {appt.preferredTime}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {appt.doctorSnapshot?.name || 'Assigned Specialist'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {appt.hospitalSnapshot?.name || 'Hospital Facility'}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: AI Assistant Teaser */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Personal Health Assistant
            </h3>
            <Link
              href="/dashboard/assistant"
              className="text-xs text-primary-600 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Open Chatbot</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <Card className="p-6 bg-gradient-to-br from-teal-500/10 via-white to-slate-50 border-teal-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Grounded Records Assistant</h4>
                <p className="text-xs text-slate-500">
                  Answers health queries strictly grounded in your confirmed prescriptions & reports.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ask questions such as: &quot;What medications am I taking for hypertension?&quot; or &quot;When was my last lipid panel?&quot;. Responses include exact citations referencing your documents.
            </p>

            <Link href="/dashboard/assistant" className="block">
              <Button className="w-full h-10 text-xs font-semibold gap-2 bg-teal-600 hover:bg-teal-700">
                <Sparkles className="w-4 h-4" />
                <span>Ask Health Assistant</span>
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
