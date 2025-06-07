export interface BloodPressureReading {
  id: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  timestamp: string; // ISO string
  notes?: string;
  imageUrl?: string;
  confidence?: number;
}

export interface BloodPressureStats {
  averageSystolic: number;
  averageDiastolic: number;
  averagePulse: number;
  lastReading: BloodPressureReading | null;
  category: 'normal' | 'elevated' | 'hypertension_stage1' | 'hypertension_stage2' | 'hypertensive_crisis';
}
