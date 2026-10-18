import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// Configure notifications handler for foreground display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

const WITTY_REMINDERS = [
  {
    title: '🍿 SCENOVA Drama Alert',
    body: 'Psst... That cliffhanger is not going to resolve itself! Time for an episode?',
  },
  {
    title: '✨ Time for a K-Drama Break',
    body: 'Your favorite characters are waiting. Grab your snacks and hit play!',
  },
  {
    title: '🎬 New Drama Unlocked',
    body: 'Fresh episodes are dropping. Check your Watchlist on SCENOVA!',
  },
  {
    title: '💫 SCENOVA Evening Vibe',
    body: 'Unwind tonight with a 10/10 masterclass drama binge.',
  },
]

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SCENOVA Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7c3aed',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    return finalStatus === 'granted'
  } catch (err) {
    console.warn('[notifications] permission error:', err)
    return false
  }
}

export async function scheduleDramaReminder(title: string, message: string, secondsFromNow = 5) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data: { screen: 'Alerts' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(secondsFromNow, 2),
      },
    })
  } catch (err) {
    console.warn('[notifications] schedule error:', err)
  }
}

export async function scheduleDailyWittyReminder() {
  try {
    const random = WITTY_REMINDERS[Math.floor(Math.random() * WITTY_REMINDERS.length)]
    await Notifications.scheduleNotificationAsync({
      content: {
        title: random.title,
        body: random.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 30,
      },
    })
  } catch (err) {
    console.warn('[notifications] daily reminder error:', err)
  }
}
