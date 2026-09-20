'use client';

import React, { useState } from 'react';
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
import { useToast } from '@/contexts/toast-context';

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
  citations?: PatientChatCitation[];
}

export type AssistantStatus = 'ready' | 'generating' | 'unable to answer' | 'unavailable';

export default function PatientAssistantPage() {
  const toast = useToast();

  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your personal health records assistant. I can answer questions regarding your confirmed ongoing prescriptions, past completed treatments, scheduled visits, recorded allergies, and diagnostic lab reports with exact citations.',
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AssistantStatus>('ready');

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
      setStatus('unavailable');
      const msg = err instanceof Error ? err.message : 'Assistant service unavailable';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I was unable to retrieve that information from your records: ${msg}. Please ensure you have confirmed prescriptions or reports uploaded.`,
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
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-700">Assistant Unavailable</span>
              </>
            )}
          </div>
          <Badge
            variant={
              status === 'unavailable'
                ? 'danger'
                : status === 'unable to answer'
                ? 'warning'
                : 'success'
            }
          >
            Status: {status.toUpperCase()}
          </Badge>
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
