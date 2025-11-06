import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { subscriptions, userEmail } = req.body;

  if (!subscriptions || !userEmail) {
    return res
      .status(400)
      .json({ error: "Отсутствуют данные подписок или email получателя." });
  }

  const emailBody = subscriptions
    .map(
      (sub, i) =>
        `${i + 1}. ${sub.name} — ${sub.price} ${sub.currency || ""} (${sub.status}), категория: ${sub.category}, следующая оплата: ${sub.nextPayment}`
    )
    .join("\n");

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Web Service SubsData" <${process.env.FROM_EMAIL}>`,
      to: userEmail,
      subject: "Список ваших подписок из SubsData",
      text: `Здравствуйте!\n\n${emailBody}\n\nС уважением, команда SubsData.`,
    });

    return res.status(200).json({ message: "Письмо успешно отправлено!" });
  } catch (error) {
    console.error("❌ Ошибка Nodemailer:", error);
    return res.status(500).json({ error: "Ошибка при отправке письма." });
  }
}