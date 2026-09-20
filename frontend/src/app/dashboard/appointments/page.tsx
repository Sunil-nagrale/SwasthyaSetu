'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Calendar,
  Building2,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { appointmentsApi } from '@/lib/api/appointments';
import { Appointment } from '@/types';
import { formatDate } from '@/lib/utils';

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await appointmentsApi.listPatientAppointments();
      const items = Array.isArray(res) ? res : (res as any).items || [];
      setAppointments(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch appointments';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600">
            <Clock className="w-4 h-4" />
            <span>Consultation Schedule</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            My Appointments
          </h1>
          <p className="text-xs text-slate-500">
            Track status of consultation requests submitted to hospital OPDs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAppointments}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/hospitals">
            <Button size="sm" className="gap-1.5 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              <span>Book New Visit</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Contract & Regulatory Policy Notice on Cancellation */}
      <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Hospital Cancellation & Rescheduling Policy</p>
          <p className="leading-relaxed text-blue-800">
            Consultation time slots are reserved directly with hospital administrative staff. If you need to reschedule or cancel a visit, please contact the hospital reception directly via phone with your Appointment ID. Online cancellations are not automated to ensure hospital bed/staff allocation safety.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Appointments List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No appointments scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven&apos;t booked any doctor visits yet. Browse verified hospitals and book a slot.
          </p>
          <Link href="/hospitals">
            <Button size="sm" className="mt-2">
              Browse Hospitals
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const isAccepted = appt.status === 'accepted';
            const isPending = appt.status === 'pending';
            const isRejected = appt.status === 'rejected';
            const isCanceled = appt.status === 'canceled';

            return (
              <Card
                key={appt.appointmentId}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        isAccepted
                          ? 'success'
                          : isPending
                          ? 'warning'
                          : isCanceled
                          ? 'default'
                          : 'danger'
                      }
                    >
                      {appt.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-600">
                      ID: <code>{appt.appointmentId.slice(0, 8)}...</code>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary-600" />
                      <span>{appt.doctorSnapshot?.name || 'Assigned Specialist'}</span>
                      {appt.doctorSnapshot?.specialty && (
                        <span className="text-xs text-slate-500 font-normal">
                          ({appt.doctorSnapshot.specialty})
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{appt.hospitalSnapshot?.name || 'Hospital Facility'}</span>
                    </p>
                  </div>

                  {appt.patientVisitNote && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <strong>Visit Note:</strong> {appt.patientVisitNote}
                    </p>
                  )}

                  {isRejected && appt.rejectionReason && (
                    <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                      <strong>Rejection Reason:</strong> {appt.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Right metadata and date */}
                <div className="border-t md:border-t-0 pt-3 md:pt-0 shrink-0 flex md:flex-col items-center md:items-end justify-between gap-2">
                  <div className="text-left md:text-right">
                    <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formatDate(appt.preferredDate)}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium block">
                      Time: {appt.preferredTime}
                    </span>
                  </div>

                  {isAccepted && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Synced to Calendar
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
