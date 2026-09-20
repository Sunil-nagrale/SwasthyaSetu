'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Pill,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { calendarApi, CalendarEventItem, CalendarEventType } from '@/lib/api/calendar';
import { useToast } from '@/contexts/toast-context';

export default function HealthCalendarPage() {
  const toast = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected date / day detail view
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Add event modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CalendarEventType>('custom');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('09:00');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await calendarApi.listEvents();
      setEvents(data || []);
    } catch (err: unknown) {
      toast.error('Failed to load health calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Calendar matrix calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create event submission
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Event title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await calendarApi.createEvent({
        title: newTitle.trim(),
        type: newType,
        date: newDate,
        time: newTime || undefined,
        description: newDescription.trim() || undefined,
      });

      toast.success('Event scheduled successfully!');
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule event';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await calendarApi.deleteEvent(eventId);
      toast.success('Event deleted');
      setEvents((prev) => prev.filter((ev) => ev.eventId !== eventId));
    } catch (err: unknown) {
      toast.error('Failed to delete calendar event');
    }
  };

  // Events for the selected date
  const selectedDayEvents = events.filter((ev) => ev.date === selectedDateStr);

  const getEventBadgeClass = (type: CalendarEventType) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'medication_reminder':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'lab_test':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'followup':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600">
            <CalendarIcon className="w-4 h-4" />
            <span>Schedule & Reminders</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Health Calendar
          </h1>
          <p className="text-xs text-slate-500">
            Auto-synced hospital appointments and daily prescription reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs font-medium"
          >
            Today
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setNewDate(selectedDateStr);
              setIsAddModalOpen(true);
            }}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (8 cols) */}
        <Card className="lg:col-span-8 p-6 shadow-sm">
          {/* Month Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-lg font-extrabold text-slate-900">
              {monthName} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                aria-label="Next Month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-3">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for first week */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 p-1 rounded-xl bg-slate-50/50" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = events.filter((ev) => ev.date === dateStr);
              const isSelected = selectedDateStr === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-20 sm:h-24 p-1.5 rounded-xl text-left border flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50/40 ring-2 ring-primary-500/20'
                      : isToday
                      ? 'border-teal-400 bg-teal-50/20'
                      : 'border-slate-100 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'h-5 w-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px]'
                          : isSelected
                          ? 'text-primary-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Micro event indicators */}
                  <div className="space-y-0.5 overflow-hidden w-full">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.eventId}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-medium border ${getEventBadgeClass(
                          ev.type
                        )}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400 block font-semibold">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Day Details Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Schedule For
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedDateStr}
                </h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewDate(selectedDateStr);
                  setIsAddModalOpen(true);
                }}
                className="gap-1 text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Clock className="w-6 h-6 mx-auto text-slate-300" />
                <p>No health events or appointments on this day.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.eventId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getEventBadgeClass(
                          ev.type
                        )}`}
                      >
                        {ev.type.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => handleDeleteEvent(ev.eventId)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{ev.title}</h4>

                    {ev.time && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{ev.time}</span>
                      </div>
                    )}

                    {ev.description && (
                      <p className="text-[11px] text-slate-600 pt-0.5">{ev.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Health Event"
        description="Add a consultation, intake reminder, or custom health milestone."
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Input
            label="Event Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Cardiology OPD Visit, Take Metformin"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Event Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as CalendarEventType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium bg-white"
              >
                <option value="appointment">Doctor Appointment</option>
                <option value="medication_reminder">Medication Reminder</option>
                <option value="lab_test">Lab / Diagnostic Test</option>
                <option value="followup">Follow-up Consultation</option>
                <option value="custom">Personal Note / Custom</option>
              </select>
            </div>

            <Input
              label="Time (HH:MM)"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>

          <Input
            label="Date"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Description (Optional)
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Fasting required 10 hours prior, bring previous reports..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting} className="font-bold">
              Save Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
