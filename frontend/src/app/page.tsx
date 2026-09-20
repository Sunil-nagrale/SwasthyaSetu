'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Building2,
  Stethoscope,
  Sparkles,
  ShieldCheck,
  Calendar,
  FileText,
  Clock,
  ArrowRight,
  HeartPulse,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicalDisclaimer } from '@/components/common/medical-disclaimer';
import { hospitalsApi } from '@/lib/api/hospitals';
import { Hospital } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('Greater Noida');
  const [popularHospitals, setPopularHospitals] = useState<Hospital[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHospitals() {
      setIsLoadingHospitals(true);
      try {
        const res = await hospitalsApi.searchHospitals({ city: searchCity, pageSize: 6 });
        const items = Array.isArray(res) ? res : res.items || [];
        setPopularHospitals(items);
      } catch (err: unknown) {
        console.error('Failed to load hospitals:', err);
        setLoadError('Unable to connect to the backend hospital catalog at this moment.');
      } finally {
        setIsLoadingHospitals(false);
      }
    }
    fetchHospitals();
  }, [searchCity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('query', searchQuery.trim());
    if (searchCity.trim()) params.set('city', searchCity.trim());
    router.push(`/hospitals?${params.toString()}`);
  };

  const commonSpecialties = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Oncology',
    'General Medicine',
    'Dermatology',
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-950 via-slate-900 to-slate-950 py-16 sm:py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(13,148,136,0.25),rgba(255,255,255,0))]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Public & Private Healthcare Infrastructure</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Healthcare access made <span className="text-primary-400">transparent</span> & verified.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Connect directly with certified hospitals, view real doctor schedules, obtain AI symptom triage, and safely maintain digital health records.
              </p>

              {/* Main Search Bar */}
              <form
                onSubmit={handleSearchSubmit}
                className="p-2 sm:p-2.5 rounded-2xl bg-white shadow-2xl border border-slate-200/20 max-w-2xl text-slate-900"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-4 relative flex items-center">
                    <MapPin className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      placeholder="City (e.g. Greater Noida)"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-5 relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Hospital name or specialty..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Button type="submit" className="w-full h-full py-2.5 rounded-xl text-sm font-semibold">
                      Search
                    </Button>
                  </div>
                </div>
              </form>

              {/* Specialty Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs text-slate-400 font-medium mr-1">Popular:</span>
                {commonSpecialties.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => router.push(`/hospitals?specialty=${encodeURIComponent(spec)}&city=${encodeURIComponent(searchCity)}`)}
                    className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Hero: AI Symptom Diagnosis Card */}
            <div className="lg:col-span-5">
              <Card className="border-teal-500/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10">
                  <HeartPulse className="w-48 h-48 text-teal-400" />
                </div>

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-primary-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Intelligent Health Guidance</span>
                  </div>
                  <CardTitle className="text-2xl text-white">Not sure which doctor to consult?</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 text-sm text-slate-300">
                  <p className="leading-relaxed">
                    Use our AI Symptom Checker for guided triage, emergency safety screening, and specialist doctor recommendations.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">1</div>
                      <span>Describe what symptoms you are feeling</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">2</div>
                      <span>Automated emergency safety check halts critical cases</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">3</div>
                      <span>Receive recommended department & book matching doctors</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Link href="/get-diagnosed" className="block">
                      <Button className="w-full gap-2 text-sm font-semibold h-11 bg-teal-500 hover:bg-teal-600 text-slate-950">
                        <span>Start Symptom Guidance</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Featured / Seeded Hospitals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600">
              <Building2 className="w-4 h-4" />
              <span>Verified Institutions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Hospitals in {searchCity || 'India'}
            </h2>
          </div>
          <Link href={`/hospitals?city=${encodeURIComponent(searchCity)}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <span>View All Hospitals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {loadError && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Backend Connection Note</p>
              <p className="text-xs text-amber-800 mt-0.5">
                {loadError} If running locally, ensure backend is running with <code>npm run dev</code> or verified seed script.
              </p>
            </div>
          </div>
        )}

        {isLoadingHospitals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : popularHospitals.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 space-y-3">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800">No hospitals found for &quot;{searchCity}&quot;</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try searching for &quot;Greater Noida&quot; to browse seeded institutions including Sharda Hospital and Kailash Hospital.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchCity('Greater Noida')}
            >
              Reset to Greater Noida
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularHospitals.map((hospital) => (
              <Card key={hospital.hospitalId} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={hospital.type === 'government' ? 'info' : 'outline'}>
                      {hospital.type === 'government' ? 'Government' : 'Private'}
                    </Badge>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {hospital.city}
                    </span>
                  </div>
                  <CardTitle className="text-xl mt-2 line-clamp-1">{hospital.name}</CardTitle>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{hospital.address}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Key Specialties
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {hospital.specialties?.slice(0, 4).map((spec) => (
                        <span
                          key={spec}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                      {(hospital.specialties?.length || 0) > 4 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                          +{(hospital.specialties?.length || 0) - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Emergency & OPD</span>
                    <Link href={`/hospitals/${hospital.hospitalId}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pillars of Healthcare Trust */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Designed for Public Healthcare Integrity
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              SwasthyaSetu eliminates opaque scheduling and fragmented records with a single, verifiable digital workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Verified Hospitals</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct catalog data maintained strictly by hospital administrators with real doctor qualifications and fees.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Safe AI Triage</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clinical safety guards stop unsafe recommendations and direct severe symptoms to emergency helplines.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">OCR Prescriptions</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload medical scans; AWS Textract OCR extracts medicines and lab findings with a human confirmation gate.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Synced Calendar</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accepted consultations and active medications automatically synchronize into your personal health schedule.
              </p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <MedicalDisclaimer />
          </div>
        </div>
      </section>
    </div>
  );
}
