import emailjs from "@emailjs/browser";
import { useAuth } from "@/context/AuthContext";

export default function SendByEmailButton({ subscriptions }) {
  const { user } = useAuth(); // получаем текущего пользователя
  const userEmail = user?.email;

  const sendEmail = async () => {
    if (!subscriptions || subscriptions.length === 0) {
      alert("Нет данных для отправки.");
      return;
    }

    if (!userEmail) {
      alert("Не удалось определить email пользователя.");
      return;
    }

    const body = subscriptions
      .map(
        (sub, i) =>
          `${i + 1}. ${sub.name} — ${sub.price} ${sub.currency || ""} (${
            sub.status
          }), категория: ${sub.category}, следующая оплата: ${sub.nextPayment}`
      )
      .join("\n");

    try {
      await emailjs.send(
        "service_efrz0js", // ✅ твой service_id
        "template_abcd123", // ✅ твой template_id
        {
          to_email: userEmail, // <–– теперь динамически!
          message: body,
          subject: "Список подписок из SubsData",
        },
        "tKxYz9_exampleKey123" // ✅ твой public_key
      );

      alert(`Письмо отправлено на ${userEmail}`);
    } catch (error) {
      console.error("Ошибка при отправке письма:", error);
      alert("Не удалось отправить письмо. Проверь настройки EmailJS.");
    }
  };

  return (
    <button
      onClick={sendEmail}
      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-3"
    >
      Отправить данные на почту
    </button>
  );
}
