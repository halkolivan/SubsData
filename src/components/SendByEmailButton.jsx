import emailjs from "@emailjs/browser";

export default function SendByEmailButton({ subscriptions }) {
  const sendEmail = async () => {
    if (!subscriptions || subscriptions.length === 0) {
      alert("Нет данных для отправки.");
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
        "service_efrz0js", // ID твоего emailjs сервиса
        "template_477s6hp", // ID шаблона
        {
          message: body,
          subject: "Список подписок из SubsData",
        },
        "EL9DfyStsk6YNx-23" // публичный ключ из EmailJS
      );

      alert("Данные успешно отправлены на вашу почту!");
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
