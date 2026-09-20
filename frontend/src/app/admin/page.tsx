'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/common/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import {
  ShieldAlert,
  Building2,
  Stethoscope,
  Plus,
  RefreshCw,
  MapPin,
  Phone,
  Trash2,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/lib/api/admin';
import { Hospital } from '@/types';

export default function PlatformAdminPage() {
  const toast = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add hospital modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('Greater Noida');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'government' | 'private'>('private');
  const [phone, setPhone] = useState('+91 120 2329700');
  const [email, setEmail] = useState('contact@hospital.org');
  const [specialties, setSpecialties] = useState('Cardiology, Neurology, Orthopedics, Pediatrics');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHospitals = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.listHospitals();
      setHospitals(data || []);
    } catch (err: unknown) {
      toast.error('Failed to load platform hospitals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim() || !address.trim()) {
      toast.error('Please fill in name, city, and address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.createHospital({
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        type,
        phone: phone.trim(),
        email: email.trim(),
        specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
        location: city.trim(),
      });

      toast.success('Hospital created successfully!');
      setIsAddModalOpen(false);
      setName('');
      setAddress('');
      await fetchHospitals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create hospital';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHospital = async (hospitalId: string) => {
    if (!confirm('Are you sure you want to delete this hospital?')) return;
    try {
      await adminApi.deleteHospital(hospitalId);
      toast.success('Hospital deleted');
      setHospitals((prev) => prev.filter((h) => h.hospitalId !== hospitalId));
    } catch (err: unknown) {
      toast.error('Failed to delete hospital');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] uppercase border border-rose-500/30">
                Super Admin Access
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Platform Registry Management
            </h1>
            <p className="text-xs text-slate-400">
              National registry of verified public and private medical institutions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHospitals}
              className="text-white border-slate-700 hover:bg-slate-800 gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Hospital</span>
            </Button>
          </div>
        </div>

        {/* Hospitals Table / Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Registered Hospitals ({hospitals.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hospitals.map((hosp) => (
              <Card key={hosp.hospitalId} className="p-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={hosp.type === 'government' ? 'info' : 'outline'}>
                      {hosp.type}
                    </Badge>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {hosp.city}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">{hosp.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{hosp.address}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {hosp.specialties?.slice(0, 3).map((spec) => (
                      <span
                        key={spec}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">
                    {hosp.hospitalId}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href={`/hospitals/${hosp.hospitalId}`}>
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteHospital(hosp.hospitalId)}
                      className="text-xs h-7 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Add Hospital Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Register Hospital into National Directory"
          description="Create a verified hospital record."
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateHospital} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hospital Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fortis Hospital"
                required
              />
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Greater Noida"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Hospital Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium bg-white"
                >
                  <option value="private">Private Healthcare</option>
                  <option value="government">Government Hospital</option>
                </select>
              </div>
              <Input
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 ..."
              />
            </div>

            <Input
              label="Full Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Plot No, Sector, City, State, PIN"
              required
            />

            <Input
              label="Specialties (Comma Separated)"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder="Cardiology, Neurology, Orthopedics"
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting} className="font-bold">
                Register Hospital
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
