import { Mail } from "lucide-react";
import { useAuth } from "@/context/auth-context-export";
import { useTranslation } from "react";

// Импортируем VITE_API_URL, который указывает на ваш бэкенд на Render
const API_URL = import.meta.env.VITE_API_URL;

export default function SendByEmailButton({ subscriptions }) {
  const { t } = useTranslation();
  // Получаем токен, userEmail и функцию обновления токена
  // ✅ refreshAccessToken — это Promise-функция, возвращающая новый токен
  const { user, token, refreshAccessToken } = useAuth();
  const userEmail = user?.email;

  // === СЕКЦИЯ ДЛЯ ПРИНУДИТЕЛЬНОГО ОБНОВЛЕНИЯ ХЕША ===
  console.log("SEND_EMAIL_V3_FIXED_20251026");
  // ===================================================

  /**
   * Отправляет подписки на почту.
   * @param {boolean} retry - Флаг, указывающий, что это повторная попытка.
   * @param {string|null} tokenOverride - Новый токен для принудительного использования (решает проблему замыкания).
   */
  const sendEmail = async (retry = false, tokenOverride = null) => {
    // 1. Определяем, какой токен использовать. Используем переданный (свежий) токен, если он есть, иначе берем из стейта.
    const currentToken = tokenOverride || token;

    console.log(
      `CACHE BUSTER V4 20251026 (Попытка: ${retry ? "Повторная" : "Первая"})`
    );

    // 2. Проверки
    if (!subscriptions || subscriptions.length === 0) {
      alert("Нет данных для отправки.");
      return;
    }
    if (!userEmail) {
      alert("Не удалось определить email пользователя. Войдите в аккаунт.");
      return;
    }
    // Используем currentToken
    if (!currentToken) {
      alert("Необходимо авторизоваться для отправки данных.");
      return;
    }

    // 3. Собираем данные (Payload)
    const payload = {
      subscriptions: subscriptions.map((sub) => ({
        // Эти поля будут отправлены на бэкенд для форматирования
        name: sub.name,
        price: sub.price,
        currency: sub.currency,
        status: sub.status,
        category: sub.category,
        nextPayment: sub.nextPayment,
      })),
      userEmail: userEmail, // Email пользователя (ПОЛУЧАТЕЛЬ)
    };

    try {
      // 4. Отправка данных на ваш API-сервер
      const res = await fetch(`${API_URL}/api/send-subs-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // ✅ ИСПОЛЬЗУЕМ currentToken (который будет новым при повторе)
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(payload),
      });

      // 🛑 ЛОГИКА ОБНОВЛЕНИЯ ТОКЕНА И ПОВТОРА
      if (res.status === 401 && !retry) {
        console.warn(
          "⚠️ Токен устарел (401). Запускаем обновление и повтор запроса."
        );

        // ЖДЕМ, ПОКА АСИНХРОННАЯ ФУНКЦИЯ ВЕРНЕТ НОВЫЙ ТОКЕН
        const newToken = await refreshAccessToken();

        if (newToken) {
          console.log("✅ Токен обновлен. Повторная отправка запроса.");
          // ✅ ПОВТОРЯЕМ ЗАПРОС, ЯВНО ПЕРЕДАВАЯ НОВЫЙ ТОКЕН
          return sendEmail(true, newToken);
        } else {
          alert(
            "❌ Критическая ошибка: Не удалось обновить токен авторизации. Пожалуйста, перезагрузите страницу и войдите снова."
          );
          return;
        }
      }

      // 5. Обработка ответа (если не 401 или это повторный запрос)
      const data = await res.json();

      if (res.ok) {
        alert(`✅ Письмо успешно отправлено на ${userEmail}`);
      } else {
        console.error("Ошибка API:", data.error, res.status);
        alert(`❌ Ошибка отправки: ${data.error || "Произошла ошибка."}`);
      }
    } catch (error) {
      console.error("Ошибка fetch:", error);
      alert("❌ Не удалось отправить запрос на сервер.");
    }
  };

  return (
    <button
      onClick={() => sendEmail()}
      disabled={!user || subscriptions.length === 0}
      className={`px-4 py-2 rounded text-white font-semibold flex w-fit items-center gap-2 transition-colors ${
        user && subscriptions.length > 0
          ? "!bg-teal-500 hover:!bg-teal-600"
          : "bg-gray-400 cursor-not-allowed"
      }`}
    >
      <Mail size={20} />
      <span>{t("SendEmail")}</span>
    </button>
  );
}
