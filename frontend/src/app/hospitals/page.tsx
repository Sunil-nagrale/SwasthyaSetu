'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Building2,
  Filter,
  ArrowRight,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { hospitalsApi } from '@/lib/api/hospitals';
import { Hospital } from '@/types';

function HospitalsSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [city, setCity] = useState(searchParams.get('city') || 'Greater Noida');
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [type, setType] = useState<'all' | 'government' | 'private'>(
    (searchParams.get('type') as 'government' | 'private') || 'all'
  );
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHospitals = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await hospitalsApi.searchHospitals({
        city: city.trim() || undefined,
        query: query.trim() || undefined,
        type: type === 'all' ? undefined : type,
        specialty: specialty.trim() || undefined,
        page,
        pageSize,
      });

      if (Array.isArray(res)) {
        setHospitals(res);
        setTotalCount(res.length);
      } else {
        setHospitals(res.items || []);
        setTotalCount(res.totalCount || res.items?.length || 0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search hospitals';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [city, query, type, specialty, page, pageSize]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    if (query.trim()) params.set('query', query.trim());
    if (type !== 'all') params.set('type', type);
    if (specialty.trim()) params.set('specialty', specialty.trim());
    router.push(`/hospitals?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const specialtyFilters = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Oncology',
    'General Medicine',
    'Pulmonology',
    'Dermatology',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600">
          <Building2 className="w-4 h-4" />
          <span>Healthcare Directory</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
          Search Hospitals & Medical Centers
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore certified medical centers, view departments, doctor profiles, and real-time consultation fees.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <form
        onSubmit={handleFilterSubmit}
        className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-3">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              City / Location
            </label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Greater Noida"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
              />
            </div>
          </div>

          <div className="lg:col-span-4">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Hospital Name or Keyword
            </label>
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Sharda, Kailash, Trauma..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Hospital Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'all' | 'government' | 'private')}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium bg-white"
            >
              <option value="all">All Types (Govt & Private)</option>
              <option value="government">Government Hospitals</option>
              <option value="private">Private Hospitals</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-end">
            <Button type="submit" className="w-full h-10 gap-2 font-semibold">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </Button>
          </div>
        </div>

        {/* Quick specialty filters */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1">Specialty:</span>
          <button
            type="button"
            onClick={() => setSpecialty('')}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              !specialty
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Specialties
          </button>
          {specialtyFilters.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSpecialty(specialty === spec ? '' : spec)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                specialty === spec
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </form>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>
          Showing {hospitals.length} result{hospitals.length === 1 ? '' : 's'}
          {city ? ` in ${city}` : ''}
          {specialty ? ` for "${specialty}"` : ''}
        </span>
        {totalPages > 1 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hospital Cards List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-white space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : hospitals.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white p-8 space-y-3">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No hospitals matched your search criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try resetting your filters or searching for &quot;Greater Noida&quot; to inspect seeded hospitals.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCity('Greater Noida');
              setQuery('');
              setType('all');
              setSpecialty('');
              setPage(1);
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {hospitals.map((hospital) => (
            <Card key={hospital.hospitalId} className="hover:border-slate-300 transition-all shadow-sm">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
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

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{hospital.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{hospital.address}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {hospital.specialties?.map((spec) => (
                      <span
                        key={spec}
                        className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    {hospital.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{hospital.phone}</span>
                      </div>
                    )}
                    {hospital.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{hospital.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 shrink-0 gap-3">
                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Active OPD & Emergency
                  </span>
                  <Link href={`/hospitals/${hospital.hospitalId}`}>
                    <Button className="gap-2 font-semibold text-xs h-10 px-5">
                      <span>View Hospital & Doctors</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>
          <span className="text-xs font-semibold text-slate-700 px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function HospitalsSearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-xl" />
          <div className="h-32 w-full bg-slate-200 animate-pulse rounded-2xl" />
          <div className="h-64 w-full bg-slate-200 animate-pulse rounded-2xl" />
        </div>
      }
    >
      <HospitalsSearchContent />
    </React.Suspense>
  );
}
