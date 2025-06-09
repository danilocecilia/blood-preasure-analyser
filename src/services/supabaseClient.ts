import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

export interface BloodPressureReading {
  id?: string;
  user_id?: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  timestamp: string;
  image_url?: string;
  notes?: string;
  created_at?: string;
}

export interface UserProfile {
  id?: string;
  user_id?: string;
  date_of_birth?: string;
  weight_kg?: number;
  height_cm?: number;
  gender?: string;
  medical_conditions?: string[];
  medications?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export const bloodPressureService = {
  async insertReading(reading: Omit<BloodPressureReading, 'id' | 'created_at'>) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Add user_id to the reading
    const readingWithUserId = {
      ...reading,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .insert([readingWithUserId])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert reading: ${error.message}`);
    }

    return data;
  },

  async getAllReadings() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch readings: ${error.message}`);
    }

    return data;
  },

  async getReadingById(id: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch reading: ${error.message}`);
    }

    return data;
  },

  async deleteReading(id: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('blood_pressure_readings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete reading: ${error.message}`);
    }
  },

  async updateReading(id: string, reading: Partial<BloodPressureReading>) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .update(reading)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update reading: ${error.message}`);
    }

    return data;
  },

  async getReadingsByDateRange(startDate: Date, endDate: Date) {
    try {
      // Check current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', sessionData.session ? 'exists' : 'null', sessionError);
      console.log('Session access token:', sessionData.session?.access_token ? 'exists' : 'missing');
      console.log('Session user:', sessionData.session?.user?.id);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error in getReadingsByDateRange:', authError);
        throw new Error('User not authenticated');
      }

      console.log('Fetching readings for user:', user.id);
      console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());


      const { data, error } = await supabase
        .from('blood_pressure_readings')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to fetch readings by date range: ${error.message}`);
      }

      console.log('Successfully fetched readings:', data.length);
      return data;
    } catch (err) {
      console.error('Unexpected error in getReadingsByDateRange:', err);
      throw err;
    }
  }
};

export const userProfileService = {
  async getProfile(): Promise<UserProfile | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found, return null
        return null;
      }
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return data;
  },

  async upsertProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }
    
    const profileWithUserId = {
      ...profile,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profileWithUserId, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save profile: ${error.message}`);
    }

    return data;
  },

  async deleteProfile(): Promise<void> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  }
};