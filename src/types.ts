export type ScaleType = 'VAS' | 'CONSTANT' | 'ASES' | 'QUICKDASH' | 'UCLA' | 'WORC';

export interface Question {
  id: string;
  text: string;
  type: 'radio' | 'slider' | 'select' | 'boolean';
  options?: { value: number; label: string }[];
  minLabel?: string;
  maxLabel?: string;
}

export interface ScaleDefinition {
  id: ScaleType;
  title: string;
  description: string;
  calculateScore: (responses: Record<string, number>) => number;
  sections: {
    title?: string;
    questions: Question[];
  }[];
}

export interface Submission {
  id?: string;
  patientLastName: string;
  patientFirstName: string;
  patientMiddleName: string;
  patientPhone?: string;
  scaleType: ScaleType;
  responses: Record<string, number>;
  score: number;
  createdAt: any;
  status: 'pending' | 'reviewed';
}
