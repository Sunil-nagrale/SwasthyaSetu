'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  FileText,
  FlaskConical,
  Check,
  Bot,
  User,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MedicalDisclaimer } from '@/components/common/medical-disclaimer';
import { chatbotApi, PatientChatCitation, ChatMessagePayload } from '@/lib/api/chatbot';
import { prescriptionsApi } from '@/lib/api/prescriptions';
import { reportsApi } from '@/lib/api/reports';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { Prescription, MedicalReport } from '@/types';

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
  citations?: PatientChatCitation[];
}

export type AssistantStatus = 'ready' | 'generating' | 'unable to answer' | 'unavailable';

export default function PatientAssistantPage() {
  const toast = useToast();
  const { user, isAuthenticated, loginAsDemo } = useAuth();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [recordsLoaded, setRecordsLoaded] = useState(false);

  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your personal health records assistant. I can answer questions regarding your confirmed ongoing prescriptions, past completed treatments, scheduled visits, recorded allergies, and diagnostic lab reports with exact citations.',
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AssistantStatus>('ready');

  // Load patient's confirmed records on mount
  useEffect(() => {
    async function loadRecords() {
      try {
        const [rxList, repList] = await Promise.all([
          prescriptionsApi.listPrescriptions().catch(() => []),
          reportsApi.listReports().catch(() => []),
        ]);
        setPrescriptions(rxList.filter((p) => p.status === 'confirmed'));
        setReports(repList.filter((r) => r.status === 'confirmed'));
      } catch (err) {
        console.warn('Could not preload patient records:', err);
      } finally {
        setRecordsLoaded(true);
      }
    }
    loadRecords();
  }, []);

  const samplePrompts = [
    'What active medications and dosages am I taking?',
    'Do I have any recorded drug or environmental allergies?',
    'When is my next scheduled doctor visit?',
    'Which doctors have I consulted previously?',
    'What was my cholesterol level in my last test?',
    'Show my completed or past medication courses.',
    'What was my brain MRI scan result?', // Grounded safe rejection test
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || status === 'generating') return;

    setInput('');
    const newHistory: ChatEntry[] = [...messages, { role: 'user', content: query }];
    setMessages(newHistory);
    setStatus('generating');

    try {
      if (!isAuthenticated) {
        await loginAsDemo('patient');
      }

      const apiPayload: ChatMessagePayload[] = newHistory.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await chatbotApi.patientChat(query, apiPayload);

      const reply = res.reply;
      if (
        reply.includes("don't have that information") ||
        reply.includes("cannot provide a medical diagnosis") ||
        reply.includes("not available")
      ) {
        setStatus('unable to answer');
      } else {
        setStatus('ready');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          citations: res.citations,
        },
      ]);
    } catch (err: unknown) {
      console.warn('Patient AI live assistant error (Bedrock pending):', err);
      const q = query.toLowerCase();

      // Guardrail 1: Disallow diagnosis and dosage prescription requests
      if (q.includes('diagnose') || q.includes('prescribe') || q.includes('how much should i take') || q.includes('cure')) {
        setStatus('ready');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'I cannot provide a medical diagnosis or prescribe medication dosages. Please consult your physician or an authorized healthcare provider.',
          },
        ]);
        return;
      }

      // Guardrail 2: Answer ongoing medications from confirmed records
      const ongoingRx = prescriptions.filter(
        (p) => p.treatmentStatus !== 'completed' && p.treatmentStatus !== 'cured'
      );
      if (q.includes('medication') || q.includes('medicine') || q.includes('taking') || q.includes('active') || q.includes('dose')) {
        if (ongoingRx.length > 0) {
          const medDetails = ongoingRx
            .map((rx) => {
              const meds = rx.medicines?.map((m) => `${m.name} (${m.dosage} - ${m.frequency})`).join(', ');
              return `${rx.doctorName || 'Doctor'} at ${rx.hospitalName || 'Hospital'} (${rx.prescriptionDate || 'Recent'}): ${meds}`;
            })
            .join('; ');

          setStatus('ready');
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `According to your verified ongoing prescriptions, you are currently prescribed: ${medDetails}.\n\n[Grounded in Verified Patient Records | Bedrock AI Account Activation Pending]`,
              citations: ongoingRx.map((rx) => ({
                recordName: `Prescription (${rx.medicines?.map((m) => m.name).join(', ') || 'Medications'})`,
                recordDate: rx.prescriptionDate,
              })),
            },
          ]);
          return;
        }
      }

      // Guardrail 3: Answer lab report findings from confirmed records
      if (q.includes('cholesterol') || q.includes('blood') || q.includes('glucose') || q.includes('hba1c') || q.includes('test') || q.includes('report') || q.includes('lab')) {
        const matchingRep = reports.find((r) =>
          r.findings?.some((f) => q.includes(f.parameter.toLowerCase())) ||
          q.includes(r.title.toLowerCase())
        );
        if (matchingRep) {
          const findingsStr = matchingRep.findings
            ?.map((f) => `${f.parameter}: ${f.value} ${f.unit || ''} (${f.status})`)
            .join(', ');
          setStatus('ready');
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `According to your confirmed report "${matchingRep.title}" dated ${matchingRep.reportDate || 'Recent'} from ${matchingRep.labName || 'Laboratory'}: ${findingsStr}. Summary: ${matchingRep.summary || 'Findings verified.'}\n\n[Grounded in Verified Patient Records | Bedrock AI Account Activation Pending]`,
              citations: [
                {
                  recordName: matchingRep.title,
                  recordDate: matchingRep.reportDate,
                  sourcePage: 1,
                },
              ],
            },
          ]);
          return;
        }
      }

      // Guardrail 4: Answer allergy query
      if (q.includes('allerg')) {
        const allergies: string[] = (user as any)?.allergies || [];
        setStatus('ready');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: allergies.length > 0
              ? `According to your patient profile, your recorded allergies are: ${allergies.join(', ')}.`
              : 'You have no drug or environmental allergies recorded in your profile.',
          },
        ]);
        return;
      }

      // Fallback: Honest Bedrock pending notification
      setStatus('unavailable');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'AI service unavailable (Bedrock account access pending). Your confirmed prescriptions and lab reports remain securely stored and viewable in your Medical Records dashboard.',
        },
      ]);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          'Conversation reset. Ask any question based on your uploaded health records.',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600">
            <Sparkles className="w-4 h-4" />
            <span>AI Clinical Assistant</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Personal Health Assistant
          </h1>
          <p className="text-xs text-slate-500">
            Answers queries grounded strictly in your confirmed prescriptions and laboratory reports.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearChat}
          className="gap-1.5 text-xs text-slate-600"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Chat</span>
        </Button>
      </div>

      {/* Main Chat Container */}
      <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[650px] bg-white">
        {/* Chat Header Status */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === 'ready' && (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700">Assistant Ready (Grounded in Verified Records)</span>
              </>
            )}
            {status === 'generating' && (
              <>
                <Loader2 className="h-3.5 w-3.5 text-teal-600 animate-spin" />
                <span className="text-xs font-bold text-teal-800">Generating Response...</span>
              </>
            )}
            {status === 'unable to answer' && (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-800">Information Not in Verified Records</span>
              </>
            )}
            {status === 'unavailable' && (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-800">Bedrock Access Pending (Verified Records Safe)</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
              Verified Records: {prescriptions.length} Prescriptions • {reports.length} Reports
            </span>
            <Badge
              variant={
                status === 'unavailable'
                  ? 'warning'
                  : status === 'unable to answer'
                  ? 'warning'
                  : 'success'
              }
            >
              Status: {status === 'unavailable' ? 'GROUNDED FALLBACK' : status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white font-medium rounded-tr-sm'
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200/70'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Citations block */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1 text-[11px]">
                    <span className="font-bold text-teal-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Document Sources:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.citations.map((cite, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg text-slate-700 border border-slate-200 shadow-2xs"
                        >
                          <Check className="w-3 h-3 text-teal-600 shrink-0" />
                          <span>
                            <strong>{cite.recordName}</strong>
                            {cite.recordDate ? ` (${cite.recordDate})` : ''}
                            {cite.sourcePage ? ` • p.${cite.sourcePage}` : ''}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {status === 'generating' && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Analyzing confirmed records...</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 2 && (
          <div className="px-6 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block w-full">
              Suggested Queries:
            </span>
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your prescribed drugs, dosages, or lab test findings..."
            className="flex-1 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
          />
          <Button
            type="submit"
            disabled={status === 'generating' || !input.trim()}
            className="h-11 px-5 gap-2 font-bold text-xs"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </Button>
        </form>
      </Card>

      <MedicalDisclaimer />
    </div>
  );
}
