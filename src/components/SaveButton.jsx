import { Save } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context-export";;

export default function SaveButton() {
  const { token, subscriptions } = useAuth();
  const [status, setStatus] = useState("");

  const handleSave = async () => {
    console.log("TOKEN:", token);
    console.log("SUBSCRIPTIONS (из state):", subscriptions);

    // Получаем актуальные подписки из localStorage
    const localSubs = JSON.parse(
      localStorage.getItem("userSubscriptions") || "[]"
    );

    // Используем самые свежие данные
    const finalSubs = subscriptions.length ? subscriptions : localSubs;
    console.log("📦 Отправляем в Drive:", finalSubs);

    if (!token) {
      setStatus("Ошибка: не авторизован");
      return;
    }

    if (!finalSubs || finalSubs.length === 0) {
      setStatus("Нет данных для сохранения");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/save-subs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptions: finalSubs }),
      });

      const data = await res.json();
      console.log("Ответ сервера:", data);

      if (res.ok && !data.error) {
        setStatus("✅ Успешно сохранено в Google Drive!");
      } else {
        setStatus(`Ошибка: ${data.error?.message || "Неизвестная ошибка"}`);
      }
    } catch (err) {
      console.error("Ошибка fetch:", err);
      setStatus("❌ Ошибка при сохранении");
    }
  };

  return (
    <button
      onClick={handleSave}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all"
    >
      <Save className="w-4 h-4" />
      Сохранить
      {status && <span className="ml-3 text-sm text-gray-200">{status}</span>}
    </button>
  );
}
