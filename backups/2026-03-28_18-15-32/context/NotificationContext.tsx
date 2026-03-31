"use client"
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { MOCK_NOTIFICATIONS, type Notification } from "@/data/mockData"

const STORAGE_KEY = "tcgacademy_notifications"

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)

  // Load read-state from localStorage (keep mock data, just sync read flag)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const readIds: string[] = JSON.parse(stored)
        setNotifications(MOCK_NOTIFICATIONS.map((n) => ({
          ...n,
          read: readIds.includes(n.id) ? true : n.read,
        })))
      }
    } catch { /* ignore */ }
  }, [])

  const persist = useCallback((next: Notification[]) => {
    setNotifications(next)
    try {
      const readIds = next.filter((n) => n.read).map((n) => n.id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds))
    } catch { /* ignore */ }
  }, [])

  const markRead = useCallback((id: string) => {
    persist(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [notifications, persist])

  const markAllRead = useCallback(() => {
    persist(notifications.map((n) => ({ ...n, read: true })))
  }, [notifications, persist])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider")
  return ctx
}
