import { Save } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context-export";
import { useTranslation } from "react-i18next";

export default function SaveButton() {
  const { t } = useTranslation();
  const { subscriptions, saveSubscriptionsToDrive } = useAuth();
  const [status, setStatus] = useState("");

  const handleSave = async () => {
    // ✅ ИСПОЛЬЗУЕМ: Актуальный state напрямую
    const finalSubs = subscriptions;
    console.log("📦 Отправляем в Drive:", finalSubs); // Для отладки

    // ❌ УДАЛЕНА: Проверка на token (она теперь внутри saveSubscriptionsToDrive)

    if (!finalSubs || finalSubs.length === 0) {
      setStatus("Нет данных для сохранения");
      return;
    }

    try {
      setStatus("Сохранение...");
      // ✅ 2. ВЫЗОВ: Используем централизованный метод
      await saveSubscriptionsToDrive(finalSubs);
      setStatus("✅ Успешно сохранено в Google Drive!");
    } catch (err) {
      console.error("❌ Ошибка при сохранении:", err);
      // Если saveSubscriptionsToDrive выбрасывает ошибку, она будет поймана
      setStatus("❌ Ошибка при сохранении");
    }
  };

  return (
    <button
      onClick={handleSave}
      className="flex items-center space-x-2 px-3 py-1.5 !bg-blue-600 hover:!bg-blue-500 text-gray-50 rounded-full transition-colors"
      title="Сохранить подписки в Google Drive"
    >
      <Save size={18} />
      <span className="font-semibold text-sm">{status || t("Save")}</span>
    </button>
  );
}
