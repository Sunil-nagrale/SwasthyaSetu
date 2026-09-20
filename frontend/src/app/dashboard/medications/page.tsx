'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Pill,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Plus,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { medicationsApi } from '@/lib/api/medications';
import { OngoingMedication } from '@/types';
import { formatDate } from '@/lib/utils';

export default function OngoingMedicationsPage() {
  const [medications, setMedications] = useState<OngoingMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMedications = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await medicationsApi.listOngoingMedications();
      setMedications(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch medications';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600">
            <Pill className="w-4 h-4" />
            <span>Medication Regimen</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Active Ongoing Medications
          </h1>
          <p className="text-xs text-slate-500">
            Automatically synchronized from your verified clinical prescriptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMedications}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/dashboard/prescriptions">
            <Button size="sm" className="gap-1.5 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              <span>Add from Prescription</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3 text-xs text-teal-900">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Medications listed here are populated when you confirm a digital prescription scan. Each active medication also automatically creates scheduled daily intake events on your <strong>Health Calendar</strong>.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Medication List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : medications.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Pill className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No ongoing medications</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload and confirm a prescription to automatically track your ongoing medicines and doses here.
          </p>
          <Link href="/dashboard/prescriptions">
            <Button size="sm" className="mt-2 text-xs">
              Upload Prescription
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map((med) => (
            <Card
              key={med.medicineId}
              className="p-5 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{med.name}</h3>
                      <span className="text-xs font-semibold text-teal-700">{med.dosage}</span>
                    </div>
                  </div>
                  <Badge variant={med.isActive !== false ? 'success' : 'default'}>
                    {med.isActive !== false ? 'ACTIVE' : 'COMPLETED'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Frequency:</span>
                    <span className="font-semibold text-slate-800">{med.frequency}</span>
                  </div>
                  {med.instructions && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Directions:</span>
                      <span className="font-semibold text-slate-800">{med.instructions}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Started On:</span>
                    <span className="font-semibold text-slate-800">{formatDate(med.startDate)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href="/dashboard/calendar"
                  className="text-primary-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>View in Calendar</span>
                </Link>
                <Link
                  href="/dashboard/prescriptions"
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Source Rx</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
