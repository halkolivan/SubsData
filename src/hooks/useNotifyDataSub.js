import { useEffect } from "react";

// 👇 отдельная функция, которую можно вызывать где угодно
export function notifySubscriptions(subscriptions) {
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }

  if (Notification.permission !== "granted") return;

  const now = new Date();
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
    }
  });
}

// 👇 обычный хук для вызова при загрузке приложения
export default function useNotifyDataSub(subscriptions) {
  useEffect(() => {
    notifySubscriptions(subscriptions);
  }, [subscriptions]);
}
