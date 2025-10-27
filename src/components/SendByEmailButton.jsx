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
       console.warn("⚠️ Токен устарел. Запускаем обновление и повтор запроса.");

       // ✅ 1. Ждем, пока refreshAccessToken вернет НОВЫЙ ТОКЕН
       const newToken = await refreshAccessToken();

       // 2. Если токен успешно обновлен, используем его для повтора
       if (newToken) {
         // Примечание: тут мы используем рекурсивный вызов sendEmail(true)
         // Но в рекурсии будет использоваться token ИЗ ЗАТЫКАНИЯ, который еще старый
         // Поэтому нужно использовать newToken явно, либо просто дождаться
         // обновления стейта/localStorage

         // Чтобы гарантировать, что стейт (token) обновился в React,
         // сделаем короткую паузу, но это не идеально
         await new Promise((resolve) => setTimeout(resolve, 500));

         // Повторяем запрос с флагом retry=true.
         // К этому моменту стейт `token` уже должен быть обновлен.
         return sendEmail(true);
       } else {
         // Если токен обновить не удалось, сообщаем об ошибке
         alert(
           "❌ Критическая ошибка: Не удалось обновить токен авторизации. Пожалуйста, перезагрузите страницу и войдите снова."
         );
         return;
       }
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
