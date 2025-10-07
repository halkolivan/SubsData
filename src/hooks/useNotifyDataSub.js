import { useEffect } from "react";

export default function useNotifyDataSub(subscriptions) {
  useEffect(() => {
    // Проверяем разрешение на уведомления
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (Notification.permission !== "granted") return;

    // --- Новое: проверка, были ли уведомления сегодня ---
    const today = new Date().toISOString().split("T")[0];
    const lastNotifyDate = localStorage.getItem("lastNotifyDate");
    if (lastNotifyDate === today) return; // Уже показывали сегодня → выходим

    const now = new Date();
    let notified = false;

    subscriptions.forEach((sub) => {
      const nextPayment = new Date(sub.nextPayment);
      const diffDays = Math.ceil((nextPayment - now) / (1000 * 60 * 60 * 24));

      if (sub.status === "active" && diffDays > 0 && diffDays <= 3) {
        new Notification("💡 Напоминание о подписке", {
          body: `Через ${diffDays} ${
            diffDays === 1 ? "день" : "дня"
          } нужно оплатить ${sub.name}`,
          icon: "/icons/icon-192x192.png",
        });
        notified = true;
      }
    });

    // --- Сохраняем дату, если хоть одно уведомление было ---
    if (notified) {
      localStorage.setItem("lastNotifyDate", today);
    }
  }, [subscriptions]);
}
