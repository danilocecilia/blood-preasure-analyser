import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationSettings {
  dailyReminder: boolean;
  reminderTime: string;
  weeklyReport: boolean;
}

export const notificationService = {
  // Request permissions and get push token
  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }
      
      // Get the token with projectId
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      console.log('Push token:', token.data);
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  },

  // Schedule daily reminder notification
  async scheduleDailyReminder(settings: NotificationSettings): Promise<void> {
    try {
      // Cancel existing daily reminder
      await this.cancelDailyReminder();

      if (!settings.dailyReminder) {
        return;
      }

      const [hours, minutes] = settings.reminderTime.split(':').map(Number);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🩺 Blood Pressure Check',
          body: "Don't forget to take your daily blood pressure reading!",
          data: { type: 'daily_reminder' },
          sound: 'default',
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
        identifier: 'daily-reminder',
      });

      console.log(`Daily reminder scheduled for ${settings.reminderTime}`);
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      throw error;
    }
  },

  // Cancel daily reminder
  async cancelDailyReminder(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync('daily-reminder');
    console.log('Cancelled daily reminder');
  },

  // Schedule weekly report
  async scheduleWeeklyReport(enable: boolean): Promise<void> {
    try {
      // Cancel existing weekly report
      await Notifications.cancelScheduledNotificationAsync('weekly-report');

      if (!enable) {
        return;
      }

      // Schedule for next Sunday at 10 AM
      const now = new Date();
      const nextSunday = new Date();
      nextSunday.setDate(now.getDate() + (7 - now.getDay()));
      nextSunday.setHours(10, 0, 0, 0);

      // If today is Sunday and it's before 10 AM, schedule for today
      if (now.getDay() === 0 && now.getHours() < 10) {
        nextSunday.setDate(now.getDate());
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Weekly Blood Pressure Report',
          body: 'Your weekly blood pressure summary is ready. Tap to view your trends and insights.',
          data: { type: 'weekly_report' },
          sound: 'default',
        },
        trigger: {
          date: nextSunday,
          repeats: true,
          repeatsComponent: {
            weekday: 1, // Monday (0 is Sunday)
            hour: 10,
            minute: 0,
          },
        },
        identifier: 'weekly-report',
      });

      console.log('Weekly report notification scheduled');
    } catch (error) {
      console.error('Error scheduling weekly report:', error);
      throw error;
    }
  },

  // Handle notification received
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  },

  // Handle notification tap
  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  },

  // Remove notification listener
  removeNotificationListener(
    subscription: Notifications.Subscription
  ): void {
    Notifications.removeNotificationSubscription(subscription);
  },
};

// Set notification categories for interactive notifications
Notifications.setNotificationCategoryAsync('reminder', [
  {
    identifier: 'snooze',
    buttonTitle: 'Snooze',
    options: {
      opensAppToForeground: false,
    },
  },
  {
    identifier: 'complete',
    buttonTitle: 'Mark as Complete',
    options: {
      opensAppToForeground: true,
    },
  },
]);