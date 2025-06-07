import { BloodPressureReading } from '../types/bloodPressure';

export const mockBloodPressureReadings: BloodPressureReading[] = [
  {
    id: '1',
    systolic: 120,
    diastolic: 80,
    pulse: 72,
    timestamp: new Date('2025-06-01T08:30:00').toISOString(),
    notes: 'Morning reading after waking up',
    imageUrl: '',
    confidence: 0.98
  },
  {
    id: '2',
    systolic: 118,
    diastolic: 78,
    pulse: 70,
    timestamp: new Date('2025-06-01T12:45:00').toISOString(),
    notes: 'Before lunch',
    imageUrl: '',
    confidence: 0.95
  },
  {
    id: '3',
    systolic: 125,
    diastolic: 82,
    pulse: 75,
    timestamp: new Date('2025-06-01T18:20:00').toISOString(),
    notes: 'After work',
    imageUrl: '',
    confidence: 0.97
  },
  {
    id: '4',
    systolic: 122,
    diastolic: 79,
    pulse: 68,
    timestamp: new Date('2025-06-02T08:15:00').toISOString(),
    notes: 'Morning reading',
    imageUrl: '',
    confidence: 0.96
  },
  {
    id: '5',
    systolic: 130,
    diastolic: 85,
    pulse: 80,
    timestamp: new Date('2025-06-02T17:30:00').toISOString(),
    notes: 'After exercise',
    imageUrl: '',
    confidence: 0.94
  },
  {
    id: '6',
    systolic: 119,
    diastolic: 77,
    pulse: 71,
    timestamp: new Date('2025-06-03T09:00:00').toISOString(),
    notes: 'Morning reading',
    imageUrl: '',
    confidence: 0.97
  },
  {
    id: '7',
    systolic: 121,
    diastolic: 79,
    pulse: 73,
    timestamp: new Date('2025-06-03T20:15:00').toISOString(),
    notes: 'Evening reading',
    imageUrl: '',
    confidence: 0.96
  },
  {
    id: '8',
    systolic: 127,
    diastolic: 83,
    pulse: 77,
    timestamp: new Date('2025-06-04T10:30:00').toISOString(),
    notes: 'After coffee',
    imageUrl: '',
    confidence: 0.95
  },
  {
    id: '9',
    systolic: 118,
    diastolic: 76,
    pulse: 69,
    timestamp: new Date('2025-06-05T08:45:00').toISOString(),
    notes: 'Morning reading',
    imageUrl: '',
    confidence: 0.98
  },
  {
    id: '10',
    systolic: 124,
    diastolic: 81,
    pulse: 74,
    timestamp: new Date('2025-06-05T19:00:00').toISOString(),
    notes: 'After dinner',
    imageUrl: '',
    confidence: 0.96
  }
];

export const getMockReadings = (): BloodPressureReading[] => {
  // Sort by timestamp just to be sure
  return [...mockBloodPressureReadings].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

export const getReadingsByDateRange = (startDate: Date, endDate: Date): BloodPressureReading[] => {
  return mockBloodPressureReadings.filter(reading => {
    const readingDate = new Date(reading.timestamp);
    return readingDate >= startDate && readingDate <= endDate;
  });
};
