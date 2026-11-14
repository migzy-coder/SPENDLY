/**
 * Web Push & Device Notifications helper for Spendly.
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await showLocalNotification(
        "Spendly",
        "Rappels activés ! Nous te préviendrons au moment choisi pour faire le point sur ton budget."
      );
    }
    return permission;
  } catch (error) {
    console.error("Failed to request notification permission", error);
    return "denied";
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function showLocalNotification(title: string, body: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "spendly-reminder",
      });
      return;
    }

    new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
    });
  } catch (error) {
    console.error("Failed to show notification", error);
  }
}
