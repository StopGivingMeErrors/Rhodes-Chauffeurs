type NotificationPayload = {
  title: string
  body: string
  tag?: string
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Velox VIP] Notifications are not supported in this environment.')
    return 'denied'
  }
  return Notification.requestPermission()
}

export async function showLocalNotification(payload: NotificationPayload) {
  if (!('Notification' in window)) {
    console.warn('[Velox VIP] Cannot show notification: API unavailable.')
    return
  }

  if (Notification.permission !== 'granted') {
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.warn('[Velox VIP] Notification permission not granted.')
      return
    }
  }

  try {
    new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
    })
  } catch (err) {
    console.error('[Velox VIP] Failed to display notification.', err)
    throw err instanceof Error ? err : new Error('Failed to display notification.')
  }
}
