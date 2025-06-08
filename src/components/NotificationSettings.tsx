import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { notificationService } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = '@blood_pressure/notification_settings';

interface NotificationSettings {
  dailyReminder: boolean;
  reminderTime: string;
  weeklyReport: boolean;
}

const defaultSettings: NotificationSettings = {
  dailyReminder: false,
  reminderTime: '20:00',
  weeklyReport: false,
};

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [time, setTime] = useState(new Date());

  // Load saved settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        
        // Set time picker time
        const [hours, minutes] = parsedSettings.reminderTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        setTime(date);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const toggleDailyReminder = async (value: boolean) => {
    const newSettings = { ...settings, dailyReminder: value };
    await saveSettings(newSettings);
    
    if (value) {
      await notificationService.scheduleDailyReminder(newSettings);
    } else {
      await notificationService.cancelDailyReminder();
    }
  };

  const toggleWeeklyReport = async (value: boolean) => {
    const newSettings = { ...settings, weeklyReport: value };
    await saveSettings(newSettings);
    await notificationService.scheduleWeeklyReport(value);
  };

  const handleTimeChange = async (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    
    if (selectedTime) {
      setTime(selectedTime);
      
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      const newSettings = { 
        ...settings, 
        reminderTime: timeString,
        dailyReminder: true // Enable daily reminder if changing time
      };
      
      await saveSettings(newSettings);
      await notificationService.scheduleDailyReminder(newSettings);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Daily Reminders</Text>
        <Switch
          value={settings.dailyReminder}
          onValueChange={toggleDailyReminder}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
        />
      </View>

      {settings.dailyReminder && (
        <TouchableOpacity 
          style={styles.timePickerContainer}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.timeLabel}>Reminder Time:</Text>
          <Text style={styles.timeText}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Weekly Reports</Text>
        <Switch
          value={settings.weeklyReport}
          onValueChange={toggleWeeklyReport}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
        />
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 8,
  },
  timeLabel: {
    fontSize: 16,
    color: '#666',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});