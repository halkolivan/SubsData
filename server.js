import express from "express";
import next from "next";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.use(bodyParser.json());

  // Твой API-роут
  server.post("/api/send-subs-email", async (req, res) => {
    const { subscriptions, userEmail } = req.body;

    if (!subscriptions || !userEmail)
      return res.status(400).json({ error: "Данные неполные" });

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"SubsData" <${process.env.FROM_EMAIL}>`,
        to: userEmail,
        subject: "Ваши подписки",
        text: subscriptions.map((s) => `${s.name} — ${s.price}`).join("\n"),
      });

      res.status(200).json({ message: "Письмо успешно отправлено" });
    } catch (err) {
      console.error("Ошибка:", err);
      res.status(500).json({ error: "Ошибка при отправке" });
    }
  });

  // Всё остальное отдаём Next.js
  server.all("*", (req, res) => handle(req, res));

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log("> Ready on http://localhost:3000");
  });
});
