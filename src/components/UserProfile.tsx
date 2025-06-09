import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { userProfileService, UserProfile } from '../services/supabaseClient';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export default function UserProfileComponent() {
  const [profile, setProfile] = useState<UserProfile>({
    date_of_birth: '',
    weight_kg: undefined,
    height_cm: undefined,
    gender: '',
    medical_conditions: [],
    medications: [],
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medicalCondition, setMedicalCondition] = useState('');
  const [medication, setMedication] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await userProfileService.getProfile();
      if (data) {
        setProfile(data);
        if (data.date_of_birth) {
          setDateOfBirth(new Date(data.date_of_birth));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await userProfileService.upsertProfile(profile);
      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setProfile({
        ...profile,
        date_of_birth: selectedDate.toISOString().split('T')[0],
      });
    }
  };

  const addMedicalCondition = () => {
    if (medicalCondition.trim()) {
      setProfile({
        ...profile,
        medical_conditions: [...(profile.medical_conditions || []), medicalCondition.trim()],
      });
      setMedicalCondition('');
    }
  };

  const removeMedicalCondition = (index: number) => {
    const newConditions = [...(profile.medical_conditions || [])];
    newConditions.splice(index, 1);
    setProfile({ ...profile, medical_conditions: newConditions });
  };

  const addMedication = () => {
    if (medication.trim()) {
      setProfile({
        ...profile,
        medications: [...(profile.medications || []), medication.trim()],
      });
      setMedication('');
    }
  };

  const removeMedication = (index: number) => {
    const newMedications = [...(profile.medications || [])];
    newMedications.splice(index, 1);
    setProfile({ ...profile, medications: newMedications });
  };

  const calculateAge = () => {
    if (!profile.date_of_birth) return null;
    const today = new Date();
    const birthDate = new Date(profile.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = () => {
    if (profile.weight_kg && profile.height_cm) {
      const heightM = profile.height_cm / 100;
      return (profile.weight_kg / (heightM * heightM)).toFixed(1);
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {profile.date_of_birth || 'Select date'}
            </Text>
          </TouchableOpacity>
          {calculateAge() && (
            <Text style={styles.ageText}>Age: {calculateAge()} years</Text>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={dateOfBirth}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderContainer}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  profile.gender === option.value && styles.selectedGender,
                ]}
                onPress={() => setProfile({ ...profile, gender: option.value })}
              >
                <Text
                  style={[
                    styles.genderOptionText,
                    profile.gender === option.value && styles.selectedGenderText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={profile.weight_kg?.toString() || ''}
              onChangeText={(text) => setProfile({ ...profile, weight_kg: text ? parseFloat(text) : undefined })}
              keyboardType="numeric"
              placeholder="70"
            />
          </View>
          
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={profile.height_cm?.toString() || ''}
              onChangeText={(text) => setProfile({ ...profile, height_cm: text ? parseInt(text) : undefined })}
              keyboardType="numeric"
              placeholder="170"
            />
          </View>
        </View>

        {calculateBMI() && (
          <Text style={styles.bmiText}>BMI: {calculateBMI()}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medical Conditions</Text>
          <View style={styles.addItemContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={medicalCondition}
              onChangeText={setMedicalCondition}
              placeholder="Add condition"
            />
            <TouchableOpacity style={styles.addButton} onPress={addMedicalCondition}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {profile.medical_conditions?.map((condition, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listItemText}>{condition}</Text>
              <TouchableOpacity onPress={() => removeMedicalCondition(index)}>
                <Text style={styles.removeButton}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medications</Text>
          <View style={styles.addItemContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={medication}
              onChangeText={setMedication}
              placeholder="Add medication"
            />
            <TouchableOpacity style={styles.addButton} onPress={addMedication}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {profile.medications?.map((med, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listItemText}>{med}</Text>
              <TouchableOpacity onPress={() => removeMedication(index)}>
                <Text style={styles.removeButton}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Name</Text>
          <TextInput
            style={styles.input}
            value={profile.emergency_contact_name || ''}
            onChangeText={(text) => setProfile({ ...profile, emergency_contact_name: text })}
            placeholder="Emergency contact name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Phone</Text>
          <TextInput
            style={styles.input}
            value={profile.emergency_contact_phone || ''}
            onChangeText={(text) => setProfile({ ...profile, emergency_contact_phone: text })}
            keyboardType="phone-pad"
            placeholder="Emergency contact phone"
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.savingButton]} 
        onPress={saveProfile}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  ageText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bmiText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
  },
  selectedGender: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedGenderText: {
    color: 'white',
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 4,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  removeButton: {
    fontSize: 20,
    color: '#FF6B6B',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  savingButton: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});