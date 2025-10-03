import { useTranslation } from "react-i18next";
export default function Footer() {
  const { t } = useTranslation();
  return (
    <div className="flex sticky bottom-0 z-10 bg-gray-300 gap-4 p-3 mt-4 justify-between rounded-b-lg">
      <span>Copyright © | Томайлы Роман 2025</span>
      <span>«Privacy Policy / Terms of Service»</span>
      <a
        href="https://t.me/tomayli80"
        target="_blank"
        rel="noopener noreferrer"
        className="!text-blue-500 hover:underline hover:!text-blue-600"
      >
        Telegram : @tomayli80
      </a>
    </div>
  );
}
