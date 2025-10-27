import { useAuth } from "@/context/auth-context-export";

// Импортируем VITE_API_URL, который указывает на ваш бэкенд на Render
const API_URL = import.meta.env.VITE_API_URL;

export default function SendByEmailButton({ subscriptions }) {
  
  console.log("SEND_EMAIL_V3_FIXED_20251026");
  // ===================================================

  // Получаем токен для авторизации и email пользователя
  const { user, token, refreshAccessToken } = useAuth();
  const userEmail = user?.email;

 const sendEmail = async (retry = false) => {
   console.log(
     `CACHE BUSTER V4 20251026 (Попытка: ${retry ? "Повторная" : "Первая"})`
   );

   // 1. Проверки
   if (!subscriptions || subscriptions.length === 0) {
     alert("Нет данных для отправки.");
     return;
   }
   if (!userEmail) {
     alert("Не удалось определить email пользователя. Войдите в аккаунт.");
     return;
   }
   // Используем текущее значение токена в замыкании
   if (!token) {
     alert("Необходимо авторизоваться для отправки данных.");
     return;
   }

   // 2. Собираем данные (Payload)
   const payload = {
     subscriptions: subscriptions.map((sub) => ({
       name: sub.name,
       price: sub.price,
       currency: sub.currency,
       status: sub.status,
       category: sub.category,
       nextPayment: sub.nextPayment,
     })),
     userEmail: userEmail,
   };

   try {
     // 3. Отправка данных на ваш API-сервер
     const res = await fetch(`${API_URL}/api/send-subs-email`, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${token}`, // Используем текущий токен
       },
       body: JSON.stringify(payload),
     });

     // 🛑 ЛОГИКА ОБНОВЛЕНИЯ ТОКЕНА И ПОВТОРА
     if (res.status === 401 && !retry) {
       console.warn("⚠️ Токен устарел (401). Запускаем обновление и повтор...");

       // 1. Запускаем обновление токена
       refreshAccessToken();

       // 2. Ждем, пока состояние обновится (1 секунды достаточно)
       await new Promise((resolve) => setTimeout(resolve, 1000));

       // 3. Повторяем запрос с флагом retry=true (предотвращает бесконечный цикл)
       return sendEmail(true);
     }

     // 4. Обработка ответа (если не 401 или это повторный запрос)
     // Если это повторный запрос и снова 401, это критическая ошибка - идем дальше

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
      onClick={sendEmail}
      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-3"
      title="Отправить список подписок на ваш Email"
    >
      ✉️ Отправить по Email
    </button>
  );
}
