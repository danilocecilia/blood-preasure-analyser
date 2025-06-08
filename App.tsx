import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import CameraComponent from './src/components/CameraComponent';
import ReadingsList from './src/components/ReadingsList';
import Dashboard from './src/components/Dashboard';
import NotificationSettings from './src/components/NotificationSettings';
import { llmAnalysisService } from './src/services/llmAnalysis';
import { bloodPressureService } from './src/services/supabaseClient';
import { s3Service } from './src/services/awsS3Client';
import { notificationService } from './src/services/notificationService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'camera' | 'readings' | 'dashboard' | 'settings'>('camera');
  const [isProcessing, setIsProcessing] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    initializeNotifications();

    // Set up notification listeners
    notificationListener.current = notificationService.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = notificationService.addNotificationResponseListener(response => {
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      switch (data?.type) {
        case 'daily_reminder':
          setCurrentTab('camera');
          break;
        case 'health_alert':
          setCurrentTab('readings');
          break;
        case 'weekly_report':
          setCurrentTab('dashboard');
          break;
        default:
          break;
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationService.removeNotificationListener(notificationListener.current);
      }
      if (responseListener.current) {
        notificationService.removeNotificationListener(responseListener.current);
      }
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      const success = await notificationService.initialize();
      if (success) {
        console.log('Notifications initialized successfully');
        // Schedule default notifications
        const defaultSettings = {
          dailyReminder: true,
          reminderTime: '20:00',
          weeklyReport: true,
        };
        await notificationService.scheduleDailyReminder(defaultSettings);
        await notificationService.scheduleWeeklyReport(true);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const handlePhotoTaken = async (uri: string) => {
    setIsProcessing(true);
    
    try {
      const fileName = s3Service.generateFileName();
      const imageUrl = await s3Service.uploadImage(uri, fileName);
      
      const analysisResult = await llmAnalysisService.analyzeBloodPressureImage(uri);
      
      if (analysisResult.confidence < 0.7) {
        Alert.alert(
          'Low Confidence',
          'The analysis confidence is low. Please verify the extracted values.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save Anyway',
              onPress: () => saveReading(analysisResult, imageUrl),
            },
          ]
        );
      } else {
        await saveReading(analysisResult, imageUrl);
      }
    } catch (error) {
      console.error('Error processing photo:', error);
      Alert.alert('Error', 'Failed to process the photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveReading = async (analysisResult: any, imageUrl: string) => {
    try {
      await bloodPressureService.insertReading({
        systolic: analysisResult.systolic,
        diastolic: analysisResult.diastolic,
        pulse: analysisResult.pulse,
        timestamp: analysisResult.timestamp,
        image_url: imageUrl,
        notes: analysisResult.notes,
      });

      // Send health alert notification if needed (this would be implemented in the notification service)
      // await notificationService.sendHealthAlert(analysisResult.systolic, analysisResult.diastolic);

      Alert.alert('Success', 'Blood pressure reading saved successfully!');
      setCurrentTab('readings');
    } catch (error) {
      console.error('Error saving reading:', error);
      Alert.alert('Error', 'Failed to save the reading. Please try again.');
    }
  };

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.processingText}>Processing your reading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Blood Pressure Analyzer</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentTab === 'camera' && styles.activeTab]}
            onPress={() => setCurrentTab('camera')}
          >
            <Text style={[styles.tabText, currentTab === 'camera' && styles.activeTabText]}>
              Camera
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentTab === 'dashboard' && styles.activeTab]}
            onPress={() => setCurrentTab('dashboard')}
          >
            <Text style={[styles.tabText, currentTab === 'dashboard' && styles.activeTabText]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentTab === 'readings' && styles.activeTab]}
            onPress={() => setCurrentTab('readings')}
          >
            <Text style={[styles.tabText, currentTab === 'readings' && styles.activeTabText]}>
              Readings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentTab === 'settings' && styles.activeTab]}
            onPress={() => setCurrentTab('settings')}
          >
            <Text style={[styles.tabText, currentTab === 'settings' && styles.activeTabText]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {currentTab === 'camera' ? (
          <CameraComponent onPhotoTaken={handlePhotoTaken} />
        ) : currentTab === 'dashboard' ? (
          <Dashboard />
        ) : currentTab === 'settings' ? (
          <NotificationSettings />
        ) : (
          <ReadingsList />
        )}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  processingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#666',
  },
});