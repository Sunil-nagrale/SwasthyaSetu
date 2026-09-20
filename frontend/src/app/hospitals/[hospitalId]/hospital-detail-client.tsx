'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  User,
  Stethoscope,
  FlaskConical,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicalDisclaimer } from '@/components/common/medical-disclaimer';
import { hospitalsApi, HospitalWithDetails } from '@/lib/api/hospitals';
import { appointmentsApi } from '@/lib/api/appointments';
import { chatbotApi, HospitalChatCitation, ChatMessagePayload } from '@/lib/api/chatbot';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { formatCurrency } from '@/lib/utils';
import { Doctor, Department } from '@/types';

export default function HospitalDetailClient() {
  const params = useParams<{ hospitalId: string }>();
  const hospitalId = params.hospitalId;
  const router = useRouter();
  const { user, isAuthenticated, loginAsDemo } = useAuth();
  const toast = useToast();

  const [hospital, setHospital] = useState<HospitalWithDetails | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'departments' | 'doctors' | 'timings' | 'labs' | 'chat'
  >('overview');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Appointment Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [prefDate, setPrefDate] = useState('');
  const [prefTime, setPrefTime] = useState('10:00');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [visitNote, setVisitNote] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessId, setBookingSuccessId] = useState<string | null>(null);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      citations?: HospitalChatCitation[];
    }>
  >([
    {
      role: 'assistant',
      content:
        'Hello! I am the verified enquiry assistant for this hospital. Ask me about departments, available doctors, consulting hours, fees, or diagnostic lab tests.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await hospitalsApi.getHospitalById(hospitalId);
      setHospital(data);

      const deptList = await hospitalsApi.getDepartments(hospitalId);
      setDepartments(deptList || []);
      if (deptList?.length > 0) {
        setSelectedDeptId(deptList[0].departmentId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch hospital details';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Dynamically load doctor availability slots when doctor or date changes
  useEffect(() => {
    async function loadDoctorSlots() {
      if (!hospitalId || !selectedDoctor || !prefDate) return;
      setIsLoadingSlots(true);
      try {
        const slotData = await hospitalsApi.getDoctorAvailability(
          hospitalId,
          selectedDoctor.doctorId,
          prefDate
        );
        const slots = slotData.availableSlots || [];
        setAvailableSlots(slots);
        if (slots.length > 0) {
          setPrefTime(slots[0]);
        } else {
          setPrefTime('');
        }
      } catch (err) {
        // Fallback default slots
        const defaultSlots = ['09:00', '09:20', '09:40', '10:00', '10:20', '10:40', '11:00', '11:20', '11:40', '12:00'];
        setAvailableSlots(defaultSlots);
        setPrefTime('09:00');
      } finally {
        setIsLoadingSlots(false);
      }
    }

    if (isBookingOpen) {
      loadDoctorSlots();
    }
  }, [hospitalId, selectedDoctor, prefDate, isBookingOpen]);

  // Handle appointment booking
  const handleOpenBooking = (doctor?: Doctor) => {
    setSelectedDoctor(doctor || hospital?.doctors?.[0] || null);
    setBookingSuccessId(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPrefDate(tomorrow.toISOString().split('T')[0]);
    setIsBookingOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) {
      toast.error('Please select a doctor.');
      return;
    }
    if (!prefDate || !prefTime) {
      toast.error('Please choose a preferred consultation date and time.');
      return;
    }

    if (!isAuthenticated) {
      toast.info('Authenticating with demo patient account for booking...');
      await loginAsDemo('patient');
    }

    setIsSubmittingBooking(true);
    try {
      const appt = await appointmentsApi.createAppointment({
        hospitalId,
        doctorId: selectedDoctor.doctorId,
        preferredDate: prefDate,
        preferredTime: prefTime,
        patientVisitNote: visitNote.trim() || undefined,
      });

      setBookingSuccessId(appt.appointmentId);
      toast.success('Appointment request submitted successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit appointment request';
      toast.error(msg);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Handle Chatbot Query
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userQuery = chatInput.trim();
    setChatInput('');

    const newHistory = [...chatMessages, { role: 'user' as const, content: userQuery }];
    setChatMessages(newHistory);
    setIsChatLoading(true);

    try {
      if (!isAuthenticated) {
        await loginAsDemo('patient');
      }

      const apiHistory: ChatMessagePayload[] = newHistory.slice(-5).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await chatbotApi.hospitalChat(hospitalId, userQuery, apiHistory);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          citations: res.citations,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hospital enquiry service unavailable';
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Apologies, I encountered an issue retrieving that information: ${msg}`,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (errorMsg || !hospital) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Hospital Not Found</h2>
        <p className="text-sm text-slate-500">{errorMsg || 'Could not locate the requested hospital record.'}</p>
        <Link href="/hospitals">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hospital Catalog</span>
          </Button>
        </Link>
      </div>
    );
  }

  const activeDepartment = departments.find((d) => d.departmentId === selectedDeptId);
  const departmentDoctors = hospital.doctors?.filter(
    (doc) => !selectedDeptId || doc.departmentId === selectedDeptId
  ) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/hospitals" className="hover:text-primary-600 transition-colors">
          Hospitals
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 truncate">{hospital.name}</span>
      </div>

      {/* Hospital Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={hospital.type === 'government' ? 'info' : 'outline'}>
              {hospital.type === 'government' ? 'Government Hospital' : 'Private Healthcare'}
            </Badge>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {hospital.city} {hospital.location ? `• ${hospital.location}` : ''}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {hospital.name}
          </h1>

          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">{hospital.address}</p>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 pt-1">
            {hospital.phone && (
              <a href={`tel:${hospital.phone}`} className="flex items-center gap-1.5 hover:text-primary-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{hospital.phone}</span>
              </a>
            )}
            {hospital.email && (
              <a href={`mailto:${hospital.email}`} className="flex items-center gap-1.5 hover:text-primary-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{hospital.email}</span>
              </a>
            )}
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Certified Healthcare Facility</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
          <Button
            size="lg"
            onClick={() => handleOpenBooking()}
            className="gap-2 font-bold shadow-md shadow-primary-600/20 text-sm"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Consultation</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setActiveTab('chat')}
            className="gap-2 text-sm text-slate-700"
          >
            <MessageSquare className="w-4 h-4 text-teal-600" />
            <span>Enquire via AI Chat</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'doctors'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Departments & Doctors ({hospital.doctors?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('timings')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'timings'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>OPD Timings & Breaks</span>
        </button>
        <button
          onClick={() => setActiveTab('labs')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'labs'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Diagnostic & Labs ({hospital.labTests?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'chat'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>Hospital AI Assistant</span>
        </button>
      </div>

      {/* TAB 0: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Departments</span>
              <p className="text-2xl font-black text-slate-900">{departments.length}</p>
              <p className="text-xs text-slate-500">Super-speciality and general disciplines</p>
            </Card>
            <Card className="p-5 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Doctors</span>
              <p className="text-2xl font-black text-slate-900">{hospital.doctors?.length || 0}</p>
              <p className="text-xs text-slate-500">Experienced consultants and surgeons</p>
            </Card>
            <Card className="p-5 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnostic Tests</span>
              <p className="text-2xl font-black text-slate-900">{hospital.labTests?.length || 0}</p>
              <p className="text-xs text-slate-500">Pathology, biochemistry, and imaging panels</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Hospital Profile & Facilities
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {hospital.name} is a premier healthcare institution providing comprehensive inpatient, outpatient, and emergency care. Equipped with advanced diagnostic labs, modular operation theaters, and round-the-clock emergency support.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Facility Classification</span>
                  <span className="font-semibold text-slate-800 capitalize">{hospital.type} Hospital</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">City / Jurisdiction</span>
                  <span className="font-semibold text-slate-800">{hospital.city}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Emergency & Trauma Desk</span>
                  <span className="font-bold text-rose-600">24x7 Active (Call 112 / 108)</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Contact & Access
              </h3>
              <div className="space-y-3 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800 block">Address</span>
                  <p className="text-slate-500 mt-0.5">{hospital.address}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">OPD Contact Number</span>
                  <p className="text-slate-500 mt-0.5">{hospital.phone}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">Official Support Email</span>
                  <p className="text-slate-500 mt-0.5">{hospital.email}</p>
                </div>
              </div>
              <div className="pt-3 flex gap-2">
                <Button size="sm" onClick={() => handleOpenBooking()} className="gap-1.5 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('timings')}>
                  <span>View OPD Timings</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 1: DEPARTMENTS & DOCTORS */}
      {activeTab === 'doctors' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Department sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Clinical Departments
            </h3>
            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedDeptId(null)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  selectedDeptId === null
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>All Departments</span>
                <span className="opacity-80">({hospital.doctors?.length || 0})</span>
              </button>
              {departments.map((dept) => {
                const count = hospital.doctors?.filter((d) => d.departmentId === dept.departmentId).length || 0;
                return (
                  <button
                    key={dept.departmentId}
                    onClick={() => setSelectedDeptId(dept.departmentId)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedDeptId === dept.departmentId
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{dept.name}</span>
                    <span className="opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>

            {activeDepartment && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <p className="font-bold text-slate-800">{activeDepartment.name}</p>
                <p className="text-slate-500">{activeDepartment.description}</p>
                {activeDepartment.facilities?.length > 0 && (
                  <div className="pt-2">
                    <span className="font-semibold text-slate-600 block mb-1">Facilities:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                      {activeDepartment.facilities.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doctors list */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Available Specialists ({departmentDoctors.length})
              </h3>
            </div>

            {departmentDoctors.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs">
                No doctors listed under this department yet.
              </div>
            ) : (
              <div className="space-y-4">
                {departmentDoctors.map((doc) => (
                  <Card key={doc.doctorId} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900">{doc.name}</h4>
                          <span className="text-xs font-medium text-primary-700">{doc.specialty}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 pl-12">
                        <p>
                          <strong>Qualifications:</strong> {doc.qualifications} • {doc.experienceYears} Years Exp.
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {doc.timings || 'OPD Hours'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {doc.availableDays?.join(', ') || 'Mon - Fri'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Consultation Fee</span>
                        <span className="text-base font-extrabold text-slate-900">
                          {formatCurrency(doc.consultationFee)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenBooking(doc)}
                        className="gap-1.5 text-xs font-semibold h-9"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book Appointment</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: OPD TIMINGS & BREAKS */}
      {activeTab === 'timings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekday OPD</span>
              <p className="text-lg font-black text-slate-900">09:00 AM – 05:00 PM</p>
              <p className="text-xs text-slate-500">Monday through Friday consultations</p>
            </Card>
            <Card className="p-5 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saturday OPD</span>
              <p className="text-lg font-black text-slate-900">09:00 AM – 01:00 PM</p>
              <p className="text-xs text-slate-500">Morning outpatient sessions</p>
            </Card>
            <Card className="p-5 space-y-1">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Sterilization & Lunch</span>
              <p className="text-lg font-black text-amber-700">01:00 PM – 02:00 PM</p>
              <p className="text-xs text-slate-500">Daily clinic disinfection interval</p>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Doctor Consultation Schedules & Lunch Windows
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Slot booking strictly respects OPD hours and excludes lunch break windows.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {hospital.doctors?.map((doc) => (
                <div key={doc.doctorId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">{doc.name}</p>
                    <p className="text-slate-500">{doc.specialty} • {doc.qualifications}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        OPD: <strong>{doc.timings || '09:00 - 17:00'}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Days: <strong>{doc.availableDays?.join(', ') || 'Mon - Fri'}</strong>
                      </span>
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        Lunch Break: 13:00 - 14:00
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenBooking(doc)}
                    className="shrink-0 gap-1.5 h-8 text-xs font-semibold"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Check Slots & Book</span>
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: DIAGNOSTIC & LAB TESTS */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Hospital Diagnostic Services & Path Lab Tests
            </h3>
          </div>

          {!hospital.labTests || hospital.labTests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs">
              No diagnostic tests published for this facility.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospital.labTests.map((lab) => (
                <Card key={lab.labId} className="p-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline">{lab.category}</Badge>
                      <span className="text-xs font-bold text-slate-900">{formatCurrency(lab.price)}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{lab.testName}</h4>
                    {lab.instructions && (
                      <p className="text-xs text-slate-500 italic">&ldquo;{lab.instructions}&rdquo;</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Results in {lab.turnaroundHours}h
                    </span>
                    <span className="text-emerald-600 font-semibold">Available in OPD</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HOSPITAL AI ENQUIRY */}
      {activeTab === 'chat' && (
        <div className="max-w-3xl mx-auto rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[550px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{hospital.name} Enquiry Assistant</h4>
                <p className="text-[10px] text-slate-500">Answers verified directly from hospital catalog data</p>
              </div>
            </div>
            <Badge variant="info">Verified Hospital AI</Badge>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white font-medium rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200/60'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Citations if available */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] space-y-1">
                      <span className="font-bold text-teal-800 block">Verified References:</span>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((cite, cIdx) => (
                          <span
                            key={cIdx}
                            className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded text-slate-700 border border-slate-200"
                          >
                            <Check className="w-3 h-3 text-teal-600" />
                            <span>
                              {cite.name} ({cite.type})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Searching verified hospital information...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about doctors, timings, fees, or facilities..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isChatLoading || !chatInput.trim()}
              className="h-9 px-4 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </Button>
          </form>
        </div>
      )}

      {/* Appointment Booking Modal */}
      <Modal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        title="Ask for Consultation Appointment"
        description={`Request an appointment at ${hospital.name}`}
      >
        {bookingSuccessId ? (
          <div className="py-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Appointment Request Submitted</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your request ID is <code>{bookingSuccessId}</code>. The hospital administration will review and confirm your slot.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1">
              <p>
                <strong>Doctor:</strong> {selectedDoctor?.name} ({selectedDoctor?.specialty})
              </p>
              <p>
                <strong>Date & Time:</strong> {prefDate} at {prefTime}
              </p>
              <p>
                <strong>Status:</strong> <span className="font-semibold text-amber-600">Pending Review</span>
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsBookingOpen(false)}>
                Close
              </Button>
              <Link href="/dashboard">
                <Button size="sm">Go to Patient Dashboard</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Select Doctor
              </label>
              <select
                value={selectedDoctor?.doctorId || ''}
                onChange={(e) => {
                  const doc = hospital.doctors?.find((d) => d.doctorId === e.target.value);
                  setSelectedDoctor(doc || null);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium bg-white"
                required
              >
                {hospital.doctors?.map((doc) => (
                  <option key={doc.doctorId} value={doc.doctorId}>
                    {doc.name} - {doc.specialty} ({formatCurrency(doc.consultationFee)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preferred Date"
                type="date"
                value={prefDate}
                onChange={(e) => setPrefDate(e.target.value)}
                required
              />
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Preferred Time Slot
                </label>
                <select
                  value={prefTime}
                  onChange={(e) => setPrefTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium bg-white"
                  required
                >
                  {isLoadingSlots ? (
                    <option value="">Loading available slots...</option>
                  ) : availableSlots.length === 0 ? (
                    <option value="">No slots available</option>
                  ) : (
                    availableSlots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Reason for Visit / Note
              </label>
              <Input
                value={visitNote}
                onChange={(e) => setVisitNote(e.target.value)}
                placeholder="Optional symptoms or consultation reason"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBookingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmittingBooking}
                className="font-semibold"
              >
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <MedicalDisclaimer />
    </div>
  );
}
