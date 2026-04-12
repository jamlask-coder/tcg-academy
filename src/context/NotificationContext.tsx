"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { MOCK_NOTIFICATIONS, type Notification } from "@/data/mockData";
import { loadUserNotifications } from "@/services/notificationService";

/** Read-IDs are stored globally (covers both mock and dynamic notifications). */
const STORAGE_KEY = "tcgacademy_notifications";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Call this from CuentaLayout when the logged-in user changes. */
  setUserId: (id: string | null) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

// ── helpers ───────────────────────────────────────────────────────────────────

function loadReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveReadIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota */
  }
}

function buildList(userId: string | null, readIds: string[]): Notification[] {
  const dynamic = userId ? loadUserNotifications(userId) : [];
  // dynamic notifications come first (most recent), then mock
  const combined = [...dynamic, ...MOCK_NOTIFICATIONS];
  return combined.map((n) => ({
    ...n,
    read: readIds.includes(n.id) ? true : n.read,
  }));
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>(loadReadIds);
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    buildList(null, loadReadIds()),
  );

  const rebuild = useCallback((uid: string | null, rids: string[]) => {
    setNotifications(buildList(uid, rids));
  }, []);

  // Refresh when another tab/component pushes a new notification
  useEffect(() => {
    const handler = () => {
      const rids = loadReadIds();
      setReadIds(rids);
      rebuild(currentUserId, rids);
    };
    window.addEventListener("tcga:notification:new", handler);
    return () => window.removeEventListener("tcga:notification:new", handler);
  }, [currentUserId, rebuild]);

  const setUserId = useCallback(
    (id: string | null) => {
      setCurrentUserId(id);
      const rids = loadReadIds();
      setReadIds(rids);
      rebuild(id, rids);
    },
    [rebuild],
  );

  const markRead = useCallback(
    (id: string) => {
      if (readIds.includes(id)) return;
      const next = [...readIds, id];
      setReadIds(next);
      saveReadIds(next);
      rebuild(currentUserId, next);
    },
    [readIds, currentUserId, rebuild],
  );

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    const next = [...new Set([...readIds, ...allIds])];
    setReadIds(next);
    saveReadIds(next);
    rebuild(currentUserId, next);
  }, [notifications, readIds, currentUserId, rebuild]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, setUserId }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  return ctx;
}
