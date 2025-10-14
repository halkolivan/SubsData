import { Save } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function SaveButton() {
  const { token, subscriptions } = useAuth();
  const [status, setStatus] = useState("");

  const handleSave = async () => {
    console.log("TOKEN:", token);
    console.log("SUBSCRIPTIONS:", subscriptions);

    if (!token) {
      setStatus("Ошибка: не авторизован");
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      setStatus("Нет данных для сохранения");
      return;
    }

    try {
      const res = await fetch("http://subsdata-api.onrender.com/save-subs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // можно оставить для теста
        },
        body: JSON.stringify({ subscriptions }),
      });

      const data = await res.json();
      console.log("Ответ сервера:", data);

      if (res.ok && !data.error) {
        setStatus("✅ Успешно сохранено в Google Drive!");
      } else {
        setStatus(
          `Ошибка сервера: ${data.error?.message || "неизвестная ошибка"}`
        );
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
