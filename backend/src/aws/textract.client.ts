import { env } from '../config/env.js';

export interface ITextractService {
  extractText(bucket: string, key: string): Promise<{ text: string; confidence: number }>;
}

export class MockTextractService implements ITextractService {
  async extractText(bucket: string, key: string): Promise<{ text: string; confidence: number }> {
    if (key.includes('prescription')) {
      return {
        text: `SHARDA HOSPITAL & MEDICAL CENTER
Date: 2026-09-15
Doctor: Dr. Ramesh Sharma, MD, Cardiology
Patient: Confidential
Diagnosis: Mild Hypertension & Vitamin D Deficiency
Rx:
1. Telmisartan 40mg - 1 tablet daily morning after breakfast - 30 days
2. Cholecalciferol 60,000 IU - 1 capsule weekly with milk - 8 weeks
3. Paracetamol 650mg - 1 tablet as needed for headache
Instructions: Low sodium diet, 30 min daily brisk walk. Follow up after 1 month.`,
        confidence: 98.5,
      };
    }

    if (key.includes('report')) {
      return {
        text: `CENTRAL CLINICAL LABORATORY
Report Date: 2026-08-28
Test Name: Comprehensive Metabolic & Lipid Profile
Patient: Confidential
Findings:
- Fasting Blood Sugar (FBS): 95 mg/dL (Reference: 70 - 100 mg/dL) [Normal]
- HbA1c: 5.4 % (Reference: < 5.7 %) [Normal]
- Total Cholesterol: 215 mg/dL (Reference: < 200 mg/dL) [High]
- HDL Cholesterol: 48 mg/dL (Reference: > 40 mg/dL) [Normal]
- LDL Cholesterol: 142 mg/dL (Reference: < 100 mg/dL) [High]
- Serum Creatinine: 0.9 mg/dL (Reference: 0.7 - 1.2 mg/dL) [Normal]
Summary: Mild hyperlipidemia noted. Dietary modification recommended.`,
        confidence: 99.1,
      };
    }

    return {
      text: `Medical Record Document\nExtracted content from ${key}`,
      confidence: 95.0,
    };
  }
}

export class AwsTextractService implements ITextractService {
  async extractText(bucket: string, key: string): Promise<{ text: string; confidence: number }> {
    const { TextractClient, AnalyzeDocumentCommand } = await import('@aws-sdk/client-textract');
    const client = new TextractClient({ region: env.AWS_REGION });
    const result = await client.send(
      new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: bucket, Name: key } },
        FeatureTypes: ['TABLES', 'FORMS'],
      })
    );

    const lines: string[] = [];
    let confidenceSum = 0;
    let confidenceCount = 0;
    for (const block of result.Blocks ?? []) {
      if (block.BlockType === 'LINE' && block.Text) {
        lines.push(block.Text);
        if (typeof block.Confidence === 'number') {
          confidenceSum += block.Confidence;
          confidenceCount += 1;
        }
      }
    }

    return {
      text: lines.join('\n'),
      confidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    };
  }
}

export const textractService: ITextractService = env.USE_MOCK_AWS
  ? new MockTextractService()
  : new AwsTextractService();
