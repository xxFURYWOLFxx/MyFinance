import api from './api'

export interface Notification {
  id: number
  notification_type: 'budget_alert' | 'goal_milestone' | 'bill_reminder' | 'system' | 'info'
  title: string
  message?: string
  link?: string
  is_read: boolean
  created_at: string
}

export const notificationsService = {
  async getNotifications(limit: number = 20, unreadOnly: boolean = false): Promise<Notification[]> {
    const response = await api.get<Notification[]>('/notifications', {
      params: { limit, unread_only: unreadOnly }
    })
    return response.data
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>('/notifications/unread-count')
    return response.data.count
  },

  async markAsRead(notificationId: number): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`)
  },

  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all')
  },

  async dismiss(notificationId: number): Promise<void> {
    await api.delete(`/notifications/${notificationId}`)
  },
}
