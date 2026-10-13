import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure how notifications behave when the app is in the foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Gracefully ignore in environments where notification handler isn't available
}

/**
 * Request notification permissions and set up default channel.
 * Remote push notifications are guarded against unsupported Expo Go Android runtimes.
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // If running on Android inside Expo Go, remote push notifications are not supported by Expo
  if (Platform.OS === 'android' && isExpoGo) {
    try {
      // Local notification channels can still be registered safely
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      if (Device.isDevice) {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // Ignore channel/permission setup error in Expo Go
    }
    return undefined;
  }

  let token: string | undefined;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return undefined;
      }
    }
  } catch {
    // Expo Go on Android does not support remote push notifications; ignore
  }

  return token;
}

/**
 * Schedule a local notification (e.g. for habits or streaks)
 */
export async function scheduleLocalNotification(title: string, body: string, seconds = 2) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      }).catch(() => {});
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });
  } catch {
    // Graceful fallback for environments where local scheduling is restricted
  }
}

