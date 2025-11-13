import { useState } from "react";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth-context-export";

export default function SaveButton() {
  const { t } = useTranslation();
  const { subscriptions, saveSubscriptionsToDrive } = useAuth();
  const [status, setStatus] = useState("");

  const handleSave = async () => {
    const finalSubs = subscriptions;   
    if (!finalSubs || finalSubs.length === 0) {
      setStatus("📦 Сохранение пропущено: пустые данные.");
      return;
    }    
    console.log("📦 Отправляем в Drive:", finalSubs);
    try {
      setStatus("Сохранение...");
      await saveSubscriptionsToDrive(finalSubs);
      setStatus("✅ Успешно сохранено в Google Drive!");
    } catch (err) {
      console.error("❌ Ошибка при сохранении:", err);
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
