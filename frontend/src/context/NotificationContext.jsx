import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import notificationsApi from "@/api/notifications.api";
import { useAuth } from "@/context/AuthContext";

const NotificationContext = createContext(null);

const CACHE_PREFIX = "notifications_cache_v1";

function getCacheKey(userId) {
  return `${CACHE_PREFIX}:${userId || "anon"}`;
}

function mergeUniqueById(nextItems, existingItems) {
  const map = new Map();

  for (const item of existingItems) map.set(item.id, item);
  for (const item of nextItems) map.set(item.id, item);

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function NotificationProvider({ children }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const persistCache = useCallback(
    (items) => {
      if (!userId) return;
      try {
        localStorage.setItem(
          getCacheKey(userId),
          JSON.stringify({ ts: Date.now(), items: items.slice(0, 120) }),
        );
      } catch {
        // ignore storage failures
      }
    },
    [userId],
  );

  const hydrateCache = useCallback(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(getCacheKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.items)) {
        setNotifications(parsed.items);
      }
    } catch {
      // ignore parse failures
    }
  }, [userId]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !userId) return;

    setIsLoading(true);
    try {
      const res = await notificationsApi.list({ limit: 100 });
      const data = Array.isArray(res?.data) ? res.data : [];
      setNotifications((prev) => {
        const merged = mergeUniqueById(data, prev);
        persistCache(merged);
        return merged;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, persistCache, userId]);

  const markRead = useCallback(
    async (id) => {
      if (!id) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
      );
      try {
        await notificationsApi.markRead(id);
      } catch {
        // best-effort, next refresh will reconcile
      }
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, readAt: n.readAt || new Date().toISOString() })),
    );

    try {
      await notificationsApi.markAllRead();
    } catch {
      // best-effort
    }
  }, []);

  const addNotification = useCallback(
    async ({
      kind = "system",
      severity = "info",
      title,
      message,
      actionPath = null,
      actionParams = null,
      signature = null,
    }) => {
      if (!title || !message) return null;

      const res = await notificationsApi.create({
        kind,
        severity,
        title,
        message,
        actionPath,
        actionParams,
        signature,
      });

      const created = res?.data;
      if (created?.id) {
        setNotifications((prev) => {
          const merged = mergeUniqueById([created], prev);
          persistCache(merged);
          return merged;
        });
      }

      return created || null;
    },
    [persistCache],
  );

  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated || !userId) return;

    if (wsRef.current) {
      shouldReconnectRef.current = false;
      wsRef.current.close();
      wsRef.current = null;
    }
    shouldReconnectRef.current = true;

    const backendUrl =
      (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const wsUrl = backendUrl.replace(/^http/i, "ws");
    const ws = new WebSocket(`${wsUrl}/ws/notifications`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const eventName = msg?.event;
        const payload = msg?.data;

        if (eventName === "notification.created" || eventName === "notification.updated") {
          if (!payload?.id) return;
          setNotifications((prev) => {
            const merged = mergeUniqueById([payload], prev);
            persistCache(merged);
            return merged;
          });
          return;
        }

        if (eventName === "notification.read") {
          if (!payload?.id) return;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.id
                ? { ...n, read: true, readAt: payload.readAt || new Date().toISOString() }
                : n,
            ),
          );
          return;
        }

        if (eventName === "notification.read_all") {
          setNotifications((prev) =>
            prev.map((n) => ({
              ...n,
              read: true,
              readAt: n.readAt || payload?.readAt || new Date().toISOString(),
            })),
          );
        }
      } catch {
        // ignore malformed websocket event
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!shouldReconnectRef.current) return;

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    wsRef.current = ws;
  }, [isAuthenticated, persistCache, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !userId) {
      setNotifications([]);
      if (wsRef.current) {
        shouldReconnectRef.current = false;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    hydrateCache();
    refreshNotifications().catch(() => {});
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        shouldReconnectRef.current = false;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [authLoading, connectWebSocket, hydrateCache, isAuthenticated, refreshNotifications, userId]);

  useEffect(() => {
    persistCache(notifications);
  }, [notifications, persistCache]);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    drawerOpen,
    setDrawerOpen,
    refreshNotifications,
    markRead,
    markAllRead,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

export default NotificationContext;
