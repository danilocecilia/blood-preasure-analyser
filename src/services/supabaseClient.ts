import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY || '';

// Use service key if available to bypass RLS, otherwise use anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
export const supabase = createClient(supabaseUrl, supabaseKey);

export interface BloodPressureReading {
  id?: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  timestamp: string;
  image_url?: string;
  notes?: string;
  created_at?: string;
}

export const bloodPressureService = {
  async insertReading(reading: Omit<BloodPressureReading, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .insert([reading])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert reading: ${error.message}`);
    }

    return data;
  },

  async getAllReadings() {
    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch readings: ${error.message}`);
    }

    return data;
  },

  async getReadingById(id: string) {
    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch reading: ${error.message}`);
    }

    return data;
  },

  async deleteReading(id: string) {
    const { error } = await supabase
      .from('blood_pressure_readings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete reading: ${error.message}`);
    }
  },

  async getReadingsByDateRange(startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch readings by date range: ${error.message}`);
    }

    return data;
  }
};