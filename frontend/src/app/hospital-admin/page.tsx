'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/common/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import {
  ShieldCheck,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Stethoscope,
  FlaskConical,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { appointmentsApi } from '@/lib/api/appointments';
import { adminApi } from '@/lib/api/admin';
import { hospitalsApi } from '@/lib/api/hospitals';
import { Appointment, Department, Doctor, LabTest } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function HospitalAdminPage() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const hospitalId = user?.hospitalId || '11111111-1111-1111-1111-111111111111';

  const [activeTab, setActiveTab] = useState<'appointments' | 'departments' | 'doctors' | 'labs'>('appointments');

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  // Rejection modal
  const [rejectApptId, setRejectApptId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Departments, Doctors, Labs state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  // Modals for adding records
  const [isAddDeptModal, setIsAddDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const [isAddDocModal, setIsAddDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocQual, setNewDocQual] = useState('MBBS, MD');
  const [newDocExp, setNewDocExp] = useState(10);
  const [newDocFee, setNewDocFee] = useState(800);
  const [newDocDeptId, setNewDocDeptId] = useState('');
  const [newDocTimings, setNewDocTimings] = useState('09:00 - 14:00');

  const [isAddLabModal, setIsAddLabModal] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabCategory, setNewLabCategory] = useState('Biochemistry');
  const [newLabPrice, setNewLabPrice] = useState(500);
  const [newLabTurnaround, setNewLabTurnaround] = useState(24);

  // Load appointments
  const loadAppointments = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsAppointmentsLoading(true);
    try {
      const data = await appointmentsApi.listHospitalAppointments();
      const items = Array.isArray(data) ? data : (data as any).items || [];
      setAppointments(items);
    } catch (err: unknown) {
      toast.error('Failed to load hospital appointments');
    } finally {
      setIsAppointmentsLoading(false);
    }
  }, [toast, isAuthenticated]);

  // Load catalog data
  const loadCatalogData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsCatalogLoading(true);
    try {
      const [deptRes, docRes, labRes] = await Promise.allSettled([
        hospitalsApi.getDepartments(hospitalId),
        adminApi.listDoctors(hospitalId),
        hospitalsApi.getHospitalById(hospitalId),
      ]);

      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value || []);
      if (docRes.status === 'fulfilled') setDoctors(docRes.value || []);
      if (labRes.status === 'fulfilled') setLabTests(labRes.value.labTests || []);
    } finally {
      setIsCatalogLoading(false);
    }
  }, [hospitalId, isAuthenticated]);

  useEffect(() => {
    loadAppointments();
    loadCatalogData();
  }, [loadAppointments, loadCatalogData]);

  // Accept Appointment
  const handleAcceptAppointment = async (appointmentId: string) => {
    setIsUpdatingStatus(true);
    try {
      await appointmentsApi.updateAppointmentStatus(appointmentId, 'accepted');
      toast.success('Appointment accepted! Patient calendar updated idempotently.');
      await loadAppointments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept appointment';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Reject Appointment
  const handleRejectAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectApptId) return;

    setIsUpdatingStatus(true);
    try {
      await appointmentsApi.updateAppointmentStatus(
        rejectApptId,
        'rejected',
        rejectionReason.trim() || 'Slot unavailable'
      );
      toast.success('Appointment rejected and patient notified.');
      setRejectApptId(null);
      setRejectionReason('');
      await loadAppointments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject appointment';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      await adminApi.createDepartment({
        hospitalId,
        name: newDeptName.trim(),
        description: newDeptDesc.trim() || 'Clinical care and diagnostics',
        facilities: ['OPD', 'Emergency Consultation'],
      });
      toast.success('Department created successfully!');
      setIsAddDeptModal(false);
      setNewDeptName('');
      setNewDeptDesc('');
      await loadCatalogData();
    } catch (err: unknown) {
      toast.error('Failed to create department');
    }
  };

  // Create Doctor
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocSpecialty.trim()) return;

    try {
      await adminApi.createDoctor({
        hospitalId,
        departmentId: newDocDeptId || departments[0]?.departmentId || 'dept-001',
        name: newDocName.trim(),
        specialty: newDocSpecialty.trim(),
        qualifications: newDocQual.trim(),
        experienceYears: Number(newDocExp) || 5,
        consultationFee: Number(newDocFee) || 500,
        timings: newDocTimings.trim(),
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      });
      toast.success('Doctor registered successfully!');
      setIsAddDocModal(false);
      setNewDocName('');
      setNewDocSpecialty('');
      await loadCatalogData();
    } catch (err: unknown) {
      toast.error('Failed to register doctor');
    }
  };

  // Create Lab Test
  const handleCreateLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName.trim()) return;

    try {
      await adminApi.createLabTest({
        hospitalId,
        testName: newLabName.trim(),
        category: newLabCategory.trim(),
        price: Number(newLabPrice) || 500,
        turnaroundHours: Number(newLabTurnaround) || 24,
      });
      toast.success('Diagnostic test created successfully!');
      setIsAddLabModal(false);
      setNewLabName('');
      await loadCatalogData();
    } catch (err: unknown) {
      toast.error('Failed to add diagnostic test');
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  return (
    <ProtectedRoute allowedRoles={['hospital_admin', 'admin']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hospital Admin Portal Header */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 font-bold text-[10px] uppercase border border-primary-500/30">
                Hospital Admin Portal
              </span>
              <span className="text-xs text-slate-400">Scoped to {hospitalId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hospital Operations Center
            </h1>
            <p className="text-xs text-slate-400">
              Manage incoming OPD consultations, departments, doctor rosters, and diagnostic pricing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadAppointments();
                loadCatalogData();
              }}
              disabled={isAppointmentsLoading || isCatalogLoading}
              className="text-white border-slate-700 hover:bg-slate-800 gap-1.5 text-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isAppointmentsLoading || isCatalogLoading ? 'animate-spin' : ''
                }`}
              />
              <span>Refresh Operations</span>
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'appointments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>
              Appointment Requests (
              {appointments.filter((a) => a.status === 'pending').length} pending)
            </span>
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'doctors'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctors ({doctors.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'departments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departments ({departments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'labs'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Diagnostics ({labTests.length})</span>
          </button>
        </div>

        {/* TAB 1: APPOINTMENTS QUEUE */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['all', 'pending', 'accepted', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st} (
                    {appointments.filter((a) => st === 'all' || a.status === st).length}
                    )
                  </button>
                ))}
              </div>
            </div>

            {isAppointmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <Card className="p-12 text-center space-y-2">
                <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800">No appointment requests</h3>
                <p className="text-xs text-slate-500">
                  There are no requests matching filter &quot;{statusFilter}&quot;.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appt) => {
                  const isPending = appt.status === 'pending';
                  const isAccepted = appt.status === 'accepted';
                  const isRejected = appt.status === 'rejected';

                  return (
                    <Card
                      key={appt.appointmentId}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              isAccepted
                                ? 'success'
                                : isPending
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {appt.status.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            ID: <code>{appt.appointmentId}</code>
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>Patient: {appt.patientSnapshot?.name || 'Registered Patient'}</span>
                            {appt.patientSnapshot?.phone && (
                              <span className="text-xs text-slate-500 font-normal">
                                • {appt.patientSnapshot.phone}
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Specialist Requested:{' '}
                            <strong>{appt.doctorSnapshot?.name}</strong> (
                            {appt.doctorSnapshot?.specialty})
                          </p>
                        </div>

                        {appt.patientVisitNote && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <strong>Note:</strong> {appt.patientVisitNote}
                          </p>
                        )}

                        {isRejected && appt.rejectionReason && (
                          <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                            <strong>Rejection Reason:</strong> {appt.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Right Action & Timing */}
                      <div className="border-t md:border-t-0 pt-3 md:pt-0 shrink-0 flex md:flex-col items-center md:items-end justify-between gap-3">
                        <div className="text-left md:text-right text-xs text-slate-600">
                          <span className="block font-bold text-slate-900">
                            {formatDate(appt.preferredDate)}
                          </span>
                          <span>Slot: {appt.preferredTime}</span>
                        </div>

                        {isPending && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setRejectApptId(appt.appointmentId);
                                setRejectionReason('');
                              }}
                              disabled={isUpdatingStatus}
                              className="gap-1 text-xs h-8"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptAppointment(appt.appointmentId)}
                              disabled={isUpdatingStatus}
                              className="gap-1 text-xs h-8 font-bold bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DOCTORS ROSTER */}
        {activeTab === 'doctors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Staff Physicians & Consultants
              </h3>
              <Button
                size="sm"
                onClick={() => setIsAddDocModal(true)}
                className="gap-1 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Doctor</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <Card key={doc.doctorId} className="p-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{doc.name}</h4>
                        <span className="text-xs font-medium text-primary-700">
                          {doc.specialty}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 pt-1">
                      <p>
                        <strong>Qualifications:</strong> {doc.qualifications}
                      </p>
                      <p>
                        <strong>Hours:</strong> {doc.timings || '09:00 - 14:00'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">
                      {formatCurrency(doc.consultationFee)}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {doc.doctorId.slice(0, 10)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hospital Clinical Departments
              </h3>
              <Button
                size="sm"
                onClick={() => setIsAddDeptModal(true)}
                className="gap-1 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <Card key={dept.departmentId} className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary-600" />
                    <h4 className="text-sm font-bold text-slate-900">{dept.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {dept.description}
                  </p>
                  {dept.facilities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {dept.facilities.map((fac, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                        >
                          {fac}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DIAGNOSTIC & LABS */}
        {activeTab === 'labs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Diagnostic Lab Catalog
              </h3>
              <Button
                size="sm"
                onClick={() => setIsAddLabModal(true)}
                className="gap-1 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Diagnostic Test</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {labTests.map((lab) => (
                <Card key={lab.labId} className="p-5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{lab.category}</Badge>
                      <span className="text-xs font-bold text-slate-900">
                        {formatCurrency(lab.price)}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{lab.testName}</h4>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Turnaround: {lab.turnaroundHours}h</span>
                    <span className="text-emerald-600 font-semibold">Active</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        <Modal
          isOpen={!!rejectApptId}
          onClose={() => setRejectApptId(null)}
          title="Reject Appointment Request"
          description="Provide a clinical or scheduling rationale for the rejection."
        >
          <form onSubmit={handleRejectAppointment} className="space-y-4">
            <Input
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Doctor is in emergency surgery, Slot fully booked"
              required
            />
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectApptId(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                isLoading={isUpdatingStatus}
                className="font-bold"
              >
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Department Modal */}
        <Modal
          isOpen={isAddDeptModal}
          onClose={() => setIsAddDeptModal(false)}
          title="Register Department"
          description="Create a new medical or surgical department."
        >
          <form onSubmit={handleCreateDepartment} className="space-y-4">
            <Input
              label="Department Name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="e.g. Neurology, Cardiology"
              required
            />
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Description
              </label>
              <textarea
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="Services offered by this department..."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddDeptModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Create Department
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Doctor Modal */}
        <Modal
          isOpen={isAddDocModal}
          onClose={() => setIsAddDocModal(false)}
          title="Register Physician"
          description="Add a certified physician to the hospital roster."
        >
          <form onSubmit={handleCreateDoctor} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Doctor Full Name"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Dr. S. K. Sharma"
                required
              />
              <Input
                label="Clinical Specialty"
                value={newDocSpecialty}
                onChange={(e) => setNewDocSpecialty(e.target.value)}
                placeholder="Cardiologist, Neurologist"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Qualifications"
                value={newDocQual}
                onChange={(e) => setNewDocQual(e.target.value)}
                placeholder="MBBS, MD, DM"
                required
              />
              <Input
                label="Experience (Years)"
                type="number"
                value={newDocExp}
                onChange={(e) => setNewDocExp(Number(e.target.value))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Consultation Fee (INR)"
                type="number"
                value={newDocFee}
                onChange={(e) => setNewDocFee(Number(e.target.value))}
                required
              />
              <Input
                label="OPD Timings"
                value={newDocTimings}
                onChange={(e) => setNewDocTimings(e.target.value)}
                placeholder="09:00 - 14:00"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddDocModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Register Doctor
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Lab Test Modal */}
        <Modal
          isOpen={isAddLabModal}
          onClose={() => setIsAddLabModal(false)}
          title="Add Diagnostic Test"
          description="Publish a new diagnostic test and price to the public catalog."
        >
          <form onSubmit={handleCreateLabTest} className="space-y-4">
            <Input
              label="Test Name"
              value={newLabName}
              onChange={(e) => setNewLabName(e.target.value)}
              placeholder="Lipid Profile, MRI Brain"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Category"
                value={newLabCategory}
                onChange={(e) => setNewLabCategory(e.target.value)}
                placeholder="Biochemistry, Radiology"
                required
              />
              <Input
                label="Price (INR)"
                type="number"
                value={newLabPrice}
                onChange={(e) => setNewLabPrice(Number(e.target.value))}
                required
              />
            </div>
            <Input
              label="Turnaround Hours"
              type="number"
              value={newLabTurnaround}
              onChange={(e) => setNewLabTurnaround(Number(e.target.value))}
              required
            />
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddLabModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Publish Test
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
