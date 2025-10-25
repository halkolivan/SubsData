import { useAuth } from "@/context/AuthContext"; //

// Импортируем VITE_API_URL, который указывает на ваш бэкенд на Render
const API_URL = import.meta.env.VITE_API_URL;

export default function SendByEmailButton({ subscriptions }) {
  
  // Получаем токен для авторизации и email пользователя
  const { user, token } = useAuth(); //
  const userEmail = user?.email; //

  const sendEmail = async () => {
    if (!subscriptions || subscriptions.length === 0) {
      alert("Нет данных для отправки.");
      return;
    }

    if (!userEmail) {
      alert("Не удалось определить email пользователя. Войдите в аккаунт.");
      return;
    }

    if (!token) {
      alert("Необходимо авторизоваться для отправки данных.");
      return;
    }

    // Собираем данные, которые отправим на сервер
    const payload = {
      subscriptions: subscriptions.map((sub) => ({
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
      // Отправка данных на ваш API-сервер
      const res = await fetch(`${API_URL}/api/send-subs-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Отправляем токен для authMiddleware на бэкенде
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✅ Письмо успешно отправлено на ${userEmail}`);
      } else {
        console.error("Ошибка API:", data.error);
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
      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-3" //
    >
      Отправить данные на почту
    </button>
  );
}
