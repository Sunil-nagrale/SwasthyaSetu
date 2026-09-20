'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  AlertTriangle,
  PhoneCall,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Clock,
  HelpCircle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MedicalDisclaimer } from '@/components/common/medical-disclaimer';
import { diagnosisApi } from '@/lib/api/diagnosis';
import { hospitalsApi } from '@/lib/api/hospitals';
import { Hospital } from '@/types';

export default function GetDiagnosedPage() {
  const router = useRouter();

  // Multi-step progression
  // 'symptoms' -> 'emergency' (if emergency triggered) -> 'questions' -> 'result'
  const [currentStep, setCurrentStep] = useState<'symptoms' | 'emergency' | 'questions' | 'result'>('symptoms');

  // Step 1 inputs
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('2 days');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');

  // Session & Emergency data
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [urgentCareMessage, setUrgentCareMessage] = useState<string | null>(null);

  // Step 2 questions & answers
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Step 3 recommendation result
  const [result, setResult] = useState<{
    symptomSummary?: string;
    urgency?: 'Routine' | 'Soon' | 'Urgent' | 'Immediate Emergency';
    urgencyLevel?: 'routine' | 'soon' | 'urgent';
    emergencyWarning?: string | null;
    recommendedSpecialty: string;
    suggestedSpecialty?: string;
    possibleCategories?: string[];
    reasoning?: string;
    rationale?: string;
    missingInformation?: string[];
    recommendedNextStep?: string;
    suggestedQuestionsForDoctor?: string[];
    disclaimer: string;
    suggestedHospitals?: Array<{
      hospitalId: string;
      name: string;
      city: string;
      departments?: { departmentId: string; name: string }[];
      doctors?: Array<{ doctorId: string; name: string; specialty: string; timings?: string }>;
    }>;
  } | null>(null);

  // Matching hospitals found in DB
  const [matchingHospitals, setMatchingHospitals] = useState<Hospital[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submit initial symptoms
  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim() || symptoms.trim().length < 3) {
      setErrorMsg('Please describe your symptoms in at least 3 characters.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const evalRes = await diagnosisApi.submitSymptoms({
        symptoms: symptoms.trim(),
        duration: duration || undefined,
        severity: severity || undefined,
      });

      // SAFETY HALT GATE:
      if (evalRes.isEmergency) {
        setUrgentCareMessage(
          evalRes.urgentCareMessage ||
            'Potential acute life-threatening emergency detected. Please call 112 / 108 or go to the nearest emergency department immediately.'
        );
        setCurrentStep('emergency');
        return;
      }

      const activeSessionId = evalRes.sessionId;
      if (!activeSessionId) {
        throw new Error('No session ID received from diagnosis service');
      }

      setSessionId(activeSessionId);

      // Fetch Follow-up questions
      const qRes = await diagnosisApi.getQuestions(activeSessionId);
      const qList = qRes.questions || [];

      if (qList.length > 0) {
        setFollowupQuestions(qList);
        const initAnswers: Record<string, string> = {};
        qList.forEach((q, i) => {
          initAnswers[`question_${i}`] = '';
        });
        setAnswers(initAnswers);
        setCurrentStep('questions');
      } else {
        // If no questions, proceed directly to result
        await fetchFinalResult(activeSessionId, {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Diagnosis guidance service error';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit answers & fetch specialist recommendation
  const handleAnswersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    setErrorMsg(null);
    setIsLoading(true);
    try {
      await fetchFinalResult(sessionId, answers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize recommendation';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFinalResult = async (activeSessionId: string, finalAnswers: Record<string, string>) => {
    const res = await diagnosisApi.getResult({
      sessionId: activeSessionId,
      answers: finalAnswers,
    });

    const parsedResult = {
      symptomSummary: (res as any).symptomSummary || symptoms,
      urgency: (res as any).urgency,
      urgencyLevel: ((res as any).urgencyLevel || (res as any).urgency?.toLowerCase() || 'routine') as any,
      emergencyWarning: (res as any).emergencyWarning,
      recommendedSpecialty: (res as any).recommendedSpecialty || (res as any).recommendedSpecialist || (res as any).suggestedSpecialty || 'General Medicine',
      suggestedSpecialty: (res as any).suggestedSpecialty,
      possibleCategories: (res as any).possibleCategories || [],
      reasoning: (res as any).reasoning || (res as any).reason || (res as any).rationale || 'Specialist consultation advised based on reported symptoms.',
      rationale: (res as any).reasoning || (res as any).reason || (res as any).rationale || 'Specialist consultation advised based on reported symptoms.',
      missingInformation: (res as any).missingInformation || [],
      recommendedNextStep: (res as any).recommendedNextStep || 'Schedule an appointment with the recommended department.',
      suggestedQuestionsForDoctor: (res as any).suggestedQuestionsForDoctor || [],
      disclaimer: res.disclaimer,
      suggestedHospitals: (res as any).suggestedHospitals,
    };

    setResult(parsedResult);
    setCurrentStep('result');

    // Query real matching hospitals with this specialty
    try {
      const matched = await hospitalsApi.searchHospitals({
        specialty: parsedResult.recommendedSpecialty,
        city: 'Greater Noida',
        pageSize: 4,
      });
      const items = Array.isArray(matched) ? matched : matched.items || [];
      setMatchingHospitals(items);
    } catch (err) {
      console.warn('Could not query matching hospitals for specialty:', err);
    }
  };

  const resetAll = () => {
    setCurrentStep('symptoms');
    setSymptoms('');
    setDuration('2 days');
    setSeverity('moderate');
    setSessionId(null);
    setUrgentCareMessage(null);
    setFollowupQuestions([]);
    setAnswers({});
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>AI-Assisted Clinical Triage & Guidance</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Symptom Guidance & Doctor Finder
        </h1>
        <p className="text-xs text-slate-500 max-w-xl mx-auto">
          Evaluate health concerns, receive specialty guidance, and identify the most appropriate hospital department.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 font-medium">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: SYMPTOMS INPUT */}
      {currentStep === 'symptoms' && (
        <Card className="shadow-lg border-slate-200/90">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary-600" />
              <span>Step 1: Describe What You Are Experiencing</span>
            </CardTitle>
            <p className="text-xs text-slate-500">
              Please enter your primary symptoms in your own words.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSymptomSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Symptoms Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Sharp pain in the lower right abdomen, mild fever, nausea since yesterday evening..."
                  rows={4}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Duration of Symptoms"
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 2 days, 1 week, sudden onset"
                />

                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Estimated Severity
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['mild', 'moderate', 'severe'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSeverity(level)}
                        className={`py-2 text-xs font-bold rounded-xl capitalize transition-all border ${
                          severity === level
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 font-bold h-12"
                  isLoading={isLoading}
                >
                  <span>Evaluate Symptoms</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: EMERGENCY SAFETY HALT SCREEN */}
      {currentStep === 'emergency' && (
        <Card className="border-2 border-rose-600 bg-rose-50/60 shadow-2xl overflow-hidden">
          <div className="bg-rose-600 text-white p-6 sm:p-8 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-rose-600 shadow-lg">
              <AlertTriangle className="h-10 w-10 animate-bounce" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              EMERGENCY MEDICAL WARNING
            </h2>
            <p className="text-xs sm:text-sm text-rose-100 max-w-xl mx-auto font-medium">
              Safety screening detected indicators of an urgent, potentially life-threatening medical emergency.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-2 text-sm text-slate-800">
              <p className="font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Urgent Clinical Directive:</span>
              </p>
              <p className="leading-relaxed font-medium">{urgentCareMessage}</p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Immediate Emergency Helplines:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="tel:112"
                  className="p-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-between transition-colors shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <PhoneCall className="w-6 h-6" />
                    <div>
                      <span className="block text-xs font-medium text-rose-200">National Emergency</span>
                      <span className="text-xl font-black">112</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-md">Call Now</span>
                </a>

                <a
                  href="tel:108"
                  className="p-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-between transition-colors shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <PhoneCall className="w-6 h-6" />
                    <div>
                      <span className="block text-xs font-medium text-rose-200">Medical Ambulance</span>
                      <span className="text-xl font-black">108</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-md">Call Now</span>
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-rose-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                AI diagnosis halted for clinical safety.
              </span>
              <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5 text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart Evaluation</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: FOLLOW-UP CLINICAL QUESTIONS */}
      {currentStep === 'questions' && (
        <Card className="shadow-lg border-slate-200/90">
          <CardHeader>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600">
              <HelpCircle className="w-4 h-4" />
              <span>Step 2: Clarifying Questions</span>
            </div>
            <CardTitle className="text-xl">Additional Clinical Details</CardTitle>
            <p className="text-xs text-slate-500">
              To narrow down the correct specialist, please answer these brief questions.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAnswersSubmit} className="space-y-5">
              {followupQuestions.map((q, idx) => {
                const key = `question_${idx}`;
                return (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      {idx + 1}. {q}
                    </label>
                    <textarea
                      value={answers[key] || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder="Your answer..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium bg-white"
                    />
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" size="sm" onClick={resetAll}>
                  Start Over
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="gap-2 font-bold h-11"
                  isLoading={isLoading}
                >
                  <span>Get Specialist Recommendation</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: SAFE SYMPTOM TRIAGE RECOMMENDATION RESULT */}
      {currentStep === 'result' && result && (
        <div className="space-y-6">
          {/* Emergency Warning Banner if present */}
          {result.emergencyWarning && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-950 flex items-start gap-3 shadow-md animate-pulse">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm text-rose-900 uppercase tracking-wide">
                  Emergency Medical Notice
                </h4>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  {result.emergencyWarning}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href="tel:112"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Emergency (112 / 108)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          <Card className="shadow-xl border-teal-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-800 to-teal-700 text-white p-6 sm:p-8 space-y-2">
              <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Clinical Triage Recommendation</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Recommended Department: {result.recommendedSpecialty}
              </h2>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge
                  variant={
                    result.urgencyLevel === 'urgent' || result.urgency === 'Urgent'
                      ? 'danger'
                      : result.urgencyLevel === 'soon' || result.urgency === 'Soon'
                      ? 'warning'
                      : 'info'
                  }
                >
                  Urgency: {result.urgency || result.urgencyLevel?.toUpperCase() || 'ROUTINE'}
                </Badge>
                {result.symptomSummary && (
                  <span className="text-xs text-teal-100 bg-white/10 px-2.5 py-0.5 rounded-full font-medium">
                    Symptoms: {result.symptomSummary}
                  </span>
                )}
              </div>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Clinical Reasoning */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Clinical Rationale
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {result.reasoning || result.rationale}
                </p>
              </div>

              {/* Possible Considerations & Missing Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.possibleCategories && result.possibleCategories.length > 0 && (
                  <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                      Possible Clinical Considerations
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-teal-950 font-medium">
                      {result.possibleCategories.map((cat, i) => (
                        <li key={i}>{cat}</li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-teal-700 italic pt-1">
                      Note: Considerations only. Definitive diagnosis requires physical examination by a registered physician.
                    </p>
                  </div>
                )}

                {result.missingInformation && result.missingInformation.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Questions for Attending Doctor
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-amber-950">
                      {result.missingInformation.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommended Next Step */}
              {result.recommendedNextStep && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Recommended Next Step
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {result.recommendedNextStep}
                  </p>
                </div>
              )}

              {/* Direct Booking Section for Matching Hospitals & Doctors */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Direct Consultation Booking with {result.recommendedSpecialty} Specialists
                  </h3>
                  <Link
                    href={`/hospitals?specialty=${encodeURIComponent(result.recommendedSpecialty)}`}
                    className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
                  >
                    <span>Browse all hospitals</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {matchingHospitals.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    Loading verified institutions offering {result.recommendedSpecialty}...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {matchingHospitals.map((hosp) => (
                      <Card key={hosp.hospitalId} className="p-4 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant={hosp.type === 'government' ? 'info' : 'outline'}>
                              {hosp.type}
                            </Badge>
                            <span className="text-[11px] text-slate-500">{hosp.city}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{hosp.name}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1">{hosp.address}</p>
                        </div>

                        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-teal-700">
                            {result.recommendedSpecialty} Available
                          </span>
                          <Link href={`/hospitals/${hosp.hospitalId}`}>
                            <Button size="sm" className="text-xs h-8 gap-1 font-bold">
                              <span>Book Consultation</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start New Triage Session</span>
                </Button>
                <Link href={`/hospitals?specialty=${encodeURIComponent(result.recommendedSpecialty)}`}>
                  <Button size="sm" className="gap-1.5">
                    <span>View All {result.recommendedSpecialty} Doctors</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <MedicalDisclaimer />
    </div>
  );
}
