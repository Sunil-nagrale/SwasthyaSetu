import {
  HospitalChatResponse,
  PatientChatResponse,
  SymptomEvaluationResponse,
  SpecialistRecommendationResponse,
  ChatMessage,
  PatientSafeAiContext,
} from '../types/ai.js';
import { ExtractedMedicine, ExtractedFinding, Prescription, MedicalReport } from '../types/record.js';
import { Hospital, Department, Doctor, LabTest } from '../types/hospital.js';
import { SHARDA_HOSPITAL_ID } from '../repositories/in-memory/seed-data.js';

export const AI_DISCLAIMER =
  'This feature provides general guidance only. It is not a medical diagnosis or emergency service.';

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'heart attack',
  'crushing chest',
  'difficulty breathing',
  'shortness of breath',
  'sudden numbness',
  'paralysis',
  'stroke',
  'loss of consciousness',
  'unconscious',
  'coughing blood',
  'severe bleeding',
  'anaphylaxis',
  'seizure',
  'suicidal',
  'poisoning',
  'overdose',
];

export interface IBedrockService {
  extractPrescription(ocrText: string): Promise<{
    diagnosis?: string;
    doctorName?: string;
    hospitalName?: string;
    prescriptionDate?: string;
    medicines: ExtractedMedicine[];
  }>;

  extractReport(ocrText: string): Promise<{
    title: string;
    testType?: string;
    labName?: string;
    reportDate?: string;
    findings: ExtractedFinding[];
    summary?: string;
  }>;

  hospitalChat(
    hospital: Hospital,
    departments: Department[],
    doctors: Doctor[],
    labs: LabTest[],
    query: string,
    history?: ChatMessage[]
  ): Promise<HospitalChatResponse>;

  patientChat(
    prescriptions: Prescription[],
    reports: MedicalReport[],
    query: string,
    history?: ChatMessage[],
    patientContext?: PatientSafeAiContext
  ): Promise<PatientChatResponse>;

  evaluateSymptoms(symptoms: string): Promise<SymptomEvaluationResponse>;

  generateFollowupQuestions(symptoms: string): Promise<string[]>;

  recommendSpecialist(
    symptoms: string,
    answers: Record<string, string>
  ): Promise<SpecialistRecommendationResponse>;
}

export class MockBedrockService implements IBedrockService {
  async extractPrescription(ocrText: string) {
    return {
      diagnosis: 'Mild Hypertension & Vitamin D Deficiency',
      doctorName: 'Dr. Ramesh Sharma',
      hospitalName: 'Sharda Hospital',
      prescriptionDate: '2026-09-15',
      medicines: [
        {
          name: 'Telmisartan',
          dosage: '40mg',
          frequency: '1 tablet daily morning after breakfast',
          duration: '30 days',
          instructions: 'Take with water after breakfast',
          isActive: true,
        },
        {
          name: 'Cholecalciferol',
          dosage: '60,000 IU',
          frequency: '1 capsule weekly',
          duration: '8 weeks',
          instructions: 'Take with milk after meals',
          isActive: true,
        },
        {
          name: 'Paracetamol',
          dosage: '650mg',
          frequency: 'As needed',
          duration: '5 days',
          instructions: 'Take for mild pain/headache',
          isActive: false,
        },
      ],
    };
  }

  async extractReport(ocrText: string) {
    return {
      title: 'Comprehensive Metabolic & Lipid Profile',
      testType: 'Lipid & Glucose Panel',
      labName: 'Central Clinical Laboratory',
      reportDate: '2026-08-28',
      findings: [
        {
          parameter: 'Fasting Blood Sugar (FBS)',
          value: '95',
          unit: 'mg/dL',
          referenceRange: '70 - 100 mg/dL',
          status: 'normal' as const,
        },
        {
          parameter: 'HbA1c',
          value: '5.4',
          unit: '%',
          referenceRange: '< 5.7 %',
          status: 'normal' as const,
        },
        {
          parameter: 'Total Cholesterol',
          value: '215',
          unit: 'mg/dL',
          referenceRange: '< 200 mg/dL',
          status: 'high' as const,
          notes: 'Borderline elevated',
        },
        {
          parameter: 'HDL Cholesterol',
          value: '48',
          unit: 'mg/dL',
          referenceRange: '> 40 mg/dL',
          status: 'normal' as const,
        },
        {
          parameter: 'LDL Cholesterol',
          value: '142',
          unit: 'mg/dL',
          referenceRange: '< 100 mg/dL',
          status: 'high' as const,
        },
      ],
      summary: 'Mild hyperlipidemia noted. Dietary modification and regular physical activity recommended.',
    };
  }

  async hospitalChat(
    hospital: Hospital,
    departments: Department[],
    doctors: Doctor[],
    labs: LabTest[],
    query: string,
    _history?: ChatMessage[]
  ): Promise<HospitalChatResponse> {
    const q = query.toLowerCase();

    // Specific question: OPD Timings for Cardiology / Departments
    if (q.includes('opd') || q.includes('timing') || q.includes('hour') || q.includes('close')) {
      const targetDept = departments.find((d) => q.includes(d.name.toLowerCase()));
      if (targetDept) {
        const deptDoc = doctors.find((d) => d.departmentId === targetDept.departmentId);
        const timings = deptDoc ? deptDoc.timings : '09:00 - 14:00';
        const days = deptDoc ? deptDoc.availableDays.join(', ') : 'Monday through Saturday';
        return {
          reply: `OPD timings for ${targetDept.name} at ${hospital.name} are ${timings} on ${days}. Lunch break is observed between 13:00 and 13:30.`,
          citations: [
            {
              type: 'department',
              name: targetDept.name,
              detail: `OPD Hours: ${timings}`,
            },
          ],
        };
      }
      return {
        reply: `General OPD timings at ${hospital.name} run from 09:00 to 14:00 (Monday to Saturday). Staff lunch break is 13:00 to 13:30. Emergency services operate 24/7.`,
        citations: [{ type: 'facility', name: hospital.name, detail: '24/7 Emergency & 09:00 - 14:00 OPD' }],
      };
    }

    // Question: Doctor availability on specific day (e.g., Saturday)
    if (q.includes('saturday') || q.includes('sunday') || q.includes('tomorrow') || q.includes('available')) {
      if (q.includes('saturday')) {
        const saturdayDocs = doctors.filter((d) => d.availableDays.includes('Saturday'));
        if (saturdayDocs.length > 0) {
          const docList = saturdayDocs.map((d) => `${d.name} (${d.specialty}, ${d.timings})`).join('; ');
          return {
            reply: `On Saturdays, the following specialists are available at ${hospital.name}: ${docList}.`,
            citations: saturdayDocs.map((d) => ({
              type: 'doctor' as const,
              name: d.name,
              detail: `${d.specialty} (${d.timings})`,
            })),
          };
        }
      }
      if (q.includes('sunday')) {
        return {
          reply: `Routine OPD consultations are closed on Sundays at ${hospital.name}. However, the 24/7 Emergency and Trauma unit remains fully operational.`,
          citations: [{ type: 'facility', name: hospital.name, detail: 'Sunday: Emergency Services Only' }],
        };
      }
    }

    // Doctor enquiry
    const matchingDoctor = doctors.find((d) => {
      const docName = d.name.toLowerCase();
      const spec = d.specialty.toLowerCase();
      const specStem = spec.replace(/ology$|ics$|try$/, '');
      return (
        q.includes(docName) ||
        q.includes(spec) ||
        (specStem.length >= 4 && q.includes(specStem)) ||
        (q.includes('cardiologist') && spec.includes('cardio')) ||
        (q.includes('neurologist') && spec.includes('neuro')) ||
        (q.includes('pediatrician') && spec.includes('pedia')) ||
        (q.includes('orthopedic') && spec.includes('ortho'))
      );
    });

    if (matchingDoctor) {
      return {
        reply: `${matchingDoctor.name} is a specialist in ${matchingDoctor.specialty} at ${hospital.name} (${matchingDoctor.qualifications}, ${matchingDoctor.experienceYears} years experience). Timings: ${matchingDoctor.timings}. Consultation fee: ₹${matchingDoctor.consultationFee}. Available on: ${matchingDoctor.availableDays.join(', ')}.`,
        citations: [
          {
            type: 'doctor',
            name: matchingDoctor.name,
            detail: `${matchingDoctor.specialty} - Timings: ${matchingDoctor.timings}`,
          },
        ],
      };
    }

    // List of all doctors
    if (q.includes('which doctor') || q.includes('who are the doctor') || q.includes('doctors available') || q.includes('doctor list')) {
      if (doctors.length > 0) {
        const docList = doctors.map((d) => `${d.name} (${d.specialty})`).join(', ');
        return {
          reply: `The following consulting doctors are listed at ${hospital.name}: ${docList}. You can book an appointment with any available doctor directly from this page.`,
          citations: doctors.map((d) => ({
            type: 'doctor' as const,
            name: d.name,
            detail: d.specialty,
          })),
        };
      }
    }

    // Department enquiry
    const matchingDept = departments.find((d) => q.includes(d.name.toLowerCase()));
    if (matchingDept) {
      return {
        reply: `The ${matchingDept.name} department at ${hospital.name} provides: ${matchingDept.description}. Facilities include: ${matchingDept.facilities.join(', ')}.`,
        citations: [
          {
            type: 'department',
            name: matchingDept.name,
            detail: `Facilities: ${matchingDept.facilities.join(', ')}`,
          },
        ],
      };
    }

    // List of all departments
    if (q.includes('what department') || q.includes('which department') || q.includes('all department') || q.includes('departments available')) {
      const deptNames = departments.map((d) => d.name).join(', ');
      return {
        reply: `${hospital.name} offers specialized care across these verified departments: ${deptNames}.`,
        citations: departments.map((d) => ({
          type: 'department' as const,
          name: d.name,
          detail: d.description,
        })),
      };
    }

    // Lab test enquiry
    const matchingLab = labs.find(
      (l) =>
        q.includes(l.testName.toLowerCase()) ||
        (q.includes('cbc') && l.testName.toLowerCase().includes('cbc')) ||
        (q.includes('lipid') && l.testName.toLowerCase().includes('lipid')) ||
        (q.includes('hba1c') && l.testName.toLowerCase().includes('hba1c')) ||
        (q.includes('tsh') && l.testName.toLowerCase().includes('tsh'))
    );
    if (matchingLab) {
      return {
        reply: `${matchingLab.testName} is available at ${hospital.name} for ₹${matchingLab.price}. Turnaround time: ${matchingLab.turnaroundHours} hours. Instructions: ${matchingLab.instructions || 'Standard sample collection'}.`,
        citations: [
          {
            type: 'lab',
            name: matchingLab.testName,
            detail: `Price: ₹${matchingLab.price}, Turnaround: ${matchingLab.turnaroundHours}h`,
          },
        ],
      };
    }

    // List of lab tests
    if (q.includes('lab test') || q.includes('tests available') || q.includes('blood test') || q.includes('investigation')) {
      if (labs.length > 0) {
        const tests = labs.map((l) => `${l.testName} (₹${l.price})`).join('; ');
        return {
          reply: `Available diagnostic lab tests at ${hospital.name} include: ${tests}.`,
          citations: labs.map((l) => ({
            type: 'lab' as const,
            name: l.testName,
            detail: `₹${l.price}`,
          })),
        };
      }
    }

    // General hospital information enquiry
    if (q.includes('address') || q.includes('phone') || q.includes('contact') || q.includes('location')) {
      return {
        reply: `${hospital.name} is located at ${hospital.address}, ${hospital.city}. Contact phone: ${hospital.phone}. Email: ${hospital.email}.`,
        citations: [
          {
            type: 'facility',
            name: hospital.name,
            detail: hospital.address,
          },
        ],
      };
    }

    // Fallback strictly grounded: "Information not available." as mandated by Contract Section 13
    return {
      reply: 'Information not available.',
      citations: [],
    };
  }

  async patientChat(
    prescriptions: Prescription[],
    reports: MedicalReport[],
    query: string,
    _history?: ChatMessage[],
    patientContext?: PatientSafeAiContext
  ): Promise<PatientChatResponse> {
    const q = query.toLowerCase();

    // 1. Safety Guardrails: refuse diagnosis and dosage prescribing
    if (q.includes('diagnose') || q.includes('prescribe') || q.includes('cure') || q.includes('dose for') || q.includes('how much should i take')) {
      return {
        reply: 'I cannot provide a medical diagnosis or prescribe medication dosages. Please consult your attending physician or an authorized healthcare professional.',
        citations: [],
      };
    }

    // 2. Query: Ongoing medications / currently taking
    if (
      q.includes('medication') ||
      q.includes('medicine') ||
      q.includes('taking') ||
      q.includes('current prescription') ||
      q.includes('ongoing prescription')
    ) {
      if (patientContext?.ongoingPrescriptions && patientContext.ongoingPrescriptions.length > 0) {
        const ongoingRx = patientContext.ongoingPrescriptions;
        const details = ongoingRx
          .map((rx) => {
            const medList = rx.medicines.map((m) => `${m.name} (${m.dosage} - ${m.frequency})`).join(', ');
            return `${rx.doctorName || 'Doctor'} at ${rx.hospitalName || 'Hospital'} (${rx.prescriptionDate || 'Recent'}): ${medList}`;
          })
          .join('; ');

        return {
          reply: `According to your verified ongoing medical records, you are currently prescribed: ${details}.`,
          citations: ongoingRx.map((rx) => ({
            recordName: `Prescription (${rx.medicines.map((m) => m.name).join(', ') || rx.diagnosis || 'Ongoing Treatment'})`,
            recordDate: rx.prescriptionDate,
          })),
        };
      }

      // Check direct prescriptions argument
      const ongoing = prescriptions.filter((p) => p.status === 'confirmed' && p.treatmentStatus !== 'completed' && p.treatmentStatus !== 'cured');
      if (ongoing.length > 0) {
        const p = ongoing[0]!;
        const medList = p.medicines.map((m) => `${m.name} (${m.dosage} - ${m.frequency})`).join(', ');
        return {
          reply: `According to your confirmed ongoing prescription from ${p.hospitalName || 'your doctor'} dated ${p.prescriptionDate || p.createdAt.split('T')[0]}, you are taking: ${medList}.`,
          citations: [
            {
              recordName: `Prescription (${p.medicines.map((m) => m.name).join(', ') || p.doctorName || 'Doctor'})`,
              recordDate: p.prescriptionDate || p.createdAt.split('T')[0],
            },
          ],
        };
      }
    }

    // 3. Query: Completed / Cured prescriptions
    if (q.includes('completed') || q.includes('cured') || q.includes('past prescription') || q.includes('previous prescription')) {
      if (patientContext?.completedPrescriptions && patientContext.completedPrescriptions.length > 0) {
        const completed = patientContext.completedPrescriptions;
        const details = completed
          .map((rx) => {
            const medList = rx.medicines.map((m) => `${m.name} (${m.dosage})`).join(', ');
            return `${rx.diagnosis || 'Treatment'} from ${rx.doctorName || 'Doctor'} on ${rx.prescriptionDate || 'Date'} (${medList})`;
          })
          .join('; ');

        return {
          reply: `Your records show the following completed treatments: ${details}. This course of medication is marked as completed.`,
          citations: completed.map((rx) => ({
            recordName: `Completed Treatment (${rx.diagnosis || 'Course Finished'})`,
            recordDate: rx.prescriptionDate,
          })),
        };
      }
    }

    // 4. Query: Appointments / schedule / visits
    if (q.includes('appointment') || q.includes('visit') || q.includes('scheduled') || q.includes('when is my')) {
      if (patientContext?.appointments && patientContext.appointments.length > 0) {
        const appts = patientContext.appointments;
        const list = appts
          .map((a) => `${a.doctorName} (${a.specialty || 'Doctor'}) at ${a.hospitalName} on ${a.preferredDate} at ${a.preferredTime} (Status: ${a.status})`)
          .join('; ');
        return {
          reply: `You have ${appts.length} recorded appointment(s): ${list}.`,
          citations: appts.map((a) => ({
            recordName: `Appointment with ${a.doctorName}`,
            recordDate: a.preferredDate,
          })),
        };
      }
    }

    // 5. Query: Which doctor did I see / doctor history
    if (q.includes('doctor did i see') || q.includes('who did i consult') || q.includes('previous doctor') || q.includes('my doctor')) {
      const doctorsSeen: string[] = [];
      if (patientContext?.appointments) {
        patientContext.appointments.forEach((a) => doctorsSeen.push(`${a.doctorName} (${a.hospitalName})`));
      }
      if (patientContext?.ongoingPrescriptions) {
        patientContext.ongoingPrescriptions.forEach((p) => {
          if (p.doctorName) doctorsSeen.push(`${p.doctorName} (${p.hospitalName || 'Clinic'})`);
        });
      }
      const uniqueDocs = Array.from(new Set(doctorsSeen));
      if (uniqueDocs.length > 0) {
        return {
          reply: `According to your medical records, you have consulted: ${uniqueDocs.join(', ')}.`,
          citations: uniqueDocs.map((doc) => ({ recordName: `Doctor Consultation: ${doc}` })),
        };
      }
    }

    // 6. Query: Recorded allergies
    if (q.includes('allerg') || q.includes('allergic')) {
      const allergies = patientContext?.patientProfile?.allergies;
      if (allergies && allergies.length > 0) {
        return {
          reply: `According to your patient profile, you have the following recorded allergies: ${allergies.join(', ')}.`,
          citations: [{ recordName: 'Patient Clinical Profile (Allergies)' }],
        };
      }
      return {
        reply: 'No known drug or environmental allergies are recorded in your verified patient profile.',
        citations: [],
      };
    }

    // 7. Query: Reports / lab tests findings
    if (q.includes('report') || q.includes('lab') || q.includes('test') || q.includes('cholesterol') || q.includes('sugar') || q.includes('blood')) {
      const activeReports = patientContext?.reports || reports.filter((r) => r.status === 'confirmed');
      if (activeReports.length > 0) {
        const bloodReport = activeReports.find(
          (r) =>
            r.title.toLowerCase().includes('blood test') ||
            r.title.toLowerCase().includes('annual blood test') ||
            r.findings.some((f) => q.includes(f.parameter.toLowerCase()))
        );
        const r = bloodReport || activeReports[0]!;
        const dateStr = r.reportDate || ('createdAt' in r ? String((r as any).createdAt).split('T')[0] : 'Recent');
        const findingsStr = r.findings
          .map((f) => `${f.parameter}: ${f.value} ${f.unit || ''} (${f.status || 'normal'})`)
          .join(', ');
        return {
          reply: `According to your '${r.title}' dated ${dateStr} from ${r.labName || 'the laboratory'}: ${findingsStr}. Summary: ${r.summary || 'Findings noted.'}`,
          citations: [
            {
              recordName: r.title,
              recordDate: dateStr,
              sourcePage: 1,
            },
          ],
        };
      }
    }

    // Fallback strictly grounded: "I don't have that information." as mandated by Contract Section 14
    return {
      reply: "I don't have that information.",
      citations: [],
    };
  }

  async evaluateSymptoms(symptoms: string): Promise<SymptomEvaluationResponse> {
    const lower = symptoms.toLowerCase();

    // 1. Emergency Risk Check (Contract Section 12)
    const isEmergency = EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
    if (isEmergency) {
      return {
        isEmergency: true,
        urgentCareMessage:
          'EMERGENCY ALERT: Your described symptoms indicate a potentially serious emergency. Please seek immediate in-person emergency medical care or call emergency services (108/112 in India) right away.',
        disclaimer: AI_DISCLAIMER,
      };
    }

    // Non-emergency: return sessionId and summary
    const sessionId = `sym_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      isEmergency: false,
      sessionId,
      summary: `Guidance session initiated for reported symptoms: "${symptoms.substring(0, 100)}${symptoms.length > 100 ? '...' : ''}".`,
      disclaimer: AI_DISCLAIMER,
    };
  }

  async generateFollowupQuestions(symptoms: string): Promise<string[]> {
    const lower = symptoms.toLowerCase();
    if (lower.includes('headache') || lower.includes('dizziness')) {
      return [
        'How long have you been experiencing the headache or dizziness?',
        'Is the pain sharp, throbbing, or a dull ache?',
        'Are you experiencing any vision changes, nausea, or sensitivity to light?',
      ];
    }

    if (lower.includes('cough') || lower.includes('fever') || lower.includes('throat')) {
      return [
        'What is your measured body temperature, and how many days has the fever persisted?',
        'Is the cough dry or productive with phlegm?',
        'Are you experiencing any throat pain or difficulty swallowing?',
      ];
    }

    return [
      'How many days or hours have you experienced these symptoms?',
      'Have you had any similar symptoms in the past?',
      'Are the symptoms getting better, worse, or staying the same?',
    ];
  }

  async recommendSpecialist(
    symptoms: string,
    _answers: Record<string, string>
  ): Promise<SpecialistRecommendationResponse> {
    const lower = symptoms.toLowerCase();
    let specialty = 'General Medicine';
    let rationale =
      'A General Physician can conduct an initial clinical evaluation, order relevant laboratory investigations, and refer to sub-specialists if required.';
    let urgency: 'routine' | 'soon' | 'urgent' | 'emergency' = 'routine';

    if (lower.includes('heart') || lower.includes('palpitations') || lower.includes('blood pressure')) {
      specialty = 'Cardiology';
      rationale =
        'Symptoms involving heart rhythm, circulation, or blood pressure variations are best evaluated by a Cardiologist.';
      urgency = lower.includes('severe') ? 'urgent' : 'soon';
    } else if (
      lower.includes('bone') ||
      lower.includes('joint') ||
      lower.includes('back pain') ||
      lower.includes('knee')
    ) {
      specialty = 'Orthopedics';
      rationale =
        'Musculoskeletal pain, joint stiffness, and mobility issues are assessed by an Orthopedic specialist.';
      urgency = 'routine';
    } else if (lower.includes('skin') || lower.includes('rash') || lower.includes('itching')) {
      specialty = 'Dermatology';
      rationale = 'Skin eruptions, lesions, and persistent itching should be examined by a Dermatologist.';
      urgency = 'routine';
    } else if (
      lower.includes('stomach') ||
      lower.includes('acid') ||
      lower.includes('digest') ||
      lower.includes('abdominal')
    ) {
      specialty = 'Gastroenterology';
      rationale =
        'Digestive tract symptoms, persistent acid reflux, and abdominal discomfort are treated by a Gastroenterologist.';
      urgency = 'soon';
    } else if (lower.includes('cough') || lower.includes('breath') || lower.includes('lungs')) {
      specialty = 'Pulmonology';
      rationale = 'Respiratory concerns and persistent coughing are managed by a Pulmonologist.';
      urgency = 'soon';
    }

    return {
      sessionId: `res_${Date.now()}`,
      recommendedSpecialty: specialty,
      rationale,
      disclaimer: AI_DISCLAIMER,
      symptomSummary: `Guidance evaluated for: "${symptoms.substring(0, 100)}".`,
      urgency,
      suggestedSpecialty: specialty,
      possibleCategories: [specialty, 'General Medicine'],
      reasoning: rationale,
      missingInformation: [
        'Vital signs (Blood pressure, Heart rate, Temperature)',
        'Physical palpation / clinical auscultation by an in-person doctor',
      ],
      recommendedNextStep: `Consult a physician in ${specialty} at an accredited hospital facility.`,
      suggestedHospitals: [
        {
          hospitalId: SHARDA_HOSPITAL_ID,
          name: 'Sharda Hospital',
          city: 'Greater Noida',
        },
      ],
    };
  }
}

export const bedrockService: IBedrockService = new MockBedrockService();
