import { useState } from "react";
import { Lock } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { NavLink } from "react-router-dom";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

// const GITHUB_CLIENT_ID =
//   import.meta.env.VITE_GITHUB_CLIENT_ID || "Ov23liyoMigb7xB7se65";

// import images
import logo from "@assets/images/SubsDataImage32.png";

export default function Header() {
  const { t, i18n } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const { isAddModalOpen, setIsAddModalOpen } = useAuth();
  const { user, login, logout, setIsAuthModalOpen } = useAuth();
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng); // переключаем язык
  };

  return (
    <div className="flex justify-center mb-4 w-full sticky top-0 z-50">
      <div className="flex justify-between w-full h-[50px] items-center p-2 gap-4 bg-gray-300 rounded-t-lg">
        <NavLink to="/">
          <img
            src={logo}
            alt="logo"
            className="transition-transform duration-300 hover:scale-110"
          />
        </NavLink>
        {/* Мои подписки — отключаем, если нет user */}
        <NavLink to={user ? "/mysubscriptions" : "#"}>
          {({ isActive }) => (
            <h5
              className={
                user
                  ? (isActive ? "text-blue-500" : "text-gray-700") +
                    " hover:text-blue-500"
                  : "text-gray-400 cursor-not-allowed"
              }
              onClick={(e) => {
                if (!user) e.preventDefault(); // 🔹 блокируем переход
              }}
            >
              {t("Mysubscriptions")}
            </h5>
          )}
        </NavLink>

        {/* Настройки — отключаем, если нет user */}
        <NavLink to={user ? "/settings" : "#"}>
          {({ isActive }) => (
            <h5
              className={
                user
                  ? (isActive ? "text-blue-500" : "text-gray-700") +
                    " hover:text-blue-500"
                  : "text-gray-400 cursor-not-allowed"
              }
              onClick={(e) => {
                if (!user) e.preventDefault(); // блокируем переход
              }}
            >
              {t("Settings")}
            </h5>
          )}
        </NavLink>

        {/* Добавление подписки */}
        <h5
          className={
            user
              ? "cursor-pointer hover:text-blue-500 font-semibold text-gray-700"
              : "text-gray-400 cursor-not-allowed font-semibold"
          }
          onClick={() => {
            if (user) {
              setIsAddModalOpen(true); // открыть модалку добавления подписки
            } else {
              setIsAuthModalOpen(true); // если не авторизован → показать окно входа
            }
          }}
        >
          {t("AddSubscription")}
        </h5>

        {/* Sign In / Sign Out */}
        {user ? (
          <>
            <h5
              className="cursor-pointer text-green-700 hover:text-green-600 "
              onClick={logout}
            >
              {t("SignOut")} ({user.name})
            </h5>
            <User className="text-green-700" />
          </>
        ) : (
          <h5
            className="cursor-pointer hover:text-blue-500 font-semibold text-gray-700"
            onClick={() => setIsModalOpen(true)}
          >
            {t("SignIn")}
          </h5>
        )}

        {/* 🔒 Кнопка приватности */}
        <button
          onClick={() => setShowPrivacy(true)}
          className="flex items-center text-gray-600 hover:text-blue-500 text-sm !bg-gray-300 hover:!border-gray-300"
        >
          <Lock className="!bg-gray-300" />
          {t("Privacy")}
        </button>

        {/* Модалка приватности */}
        {showPrivacy && (
          <div className="fixed flex items-center justify-center bg-black/50 inset-0 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full text-gray-700">
              <h2 className="text-lg font-semibold mb-3">{t("Privacy")}</h2>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>{t("PrivacyLocal")}</li>
                <li>{t("PrivacyNoServer")}</li>
                <li>{t("PrivacyGDPR")}</li>
              </ul>
              <button
                onClick={() => setShowPrivacy(false)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {t("Close")}
              </button>
            </div>
          </div>
        )}

        {/* Переключатель языков */}
        <div className="flex items-center">
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-gray-300 text-gray-700 hover:border-blue-400"
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="ro">Română</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="it">Italiano</option>
            <option value="es">Español</option>
            <option value="nl">Nederlands</option>
            <option value="pt">Português</option>
          </select>
        </div>

        {/* Модальное окно */}
        {isModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsModalOpen(false)}
            />
            <div className="relative bg-white rounded-lg shadow-lg p-6 w-[400px]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-2 right-2 text-red-700 hover:text-red-500 !bg-white hover:!border-white"
              >
                ✖
              </button>
              <h2 className="text-xl font-bold mb-4">{t("SignIn")}</h2>
              <p className="text-gray-600 mb-4">{t("ChooseAuthMethod")}</p>

              {/* Google Auth */}
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  const decoded = jwtDecode(credentialResponse.credential);
                  login(
                    { name: decoded.name, email: decoded.email },
                    credentialResponse.credential
                  );
                  setIsModalOpen(false);
                }}
                onError={() => {
                  console.log("Login Failed");
                }}
              />

              {/* GitHub Auth */}
              <button
                onClick={() => {
                  const redirectUri = `${window.location.origin}/auth/callback`;
                  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user&redirect_uri=${encodeURIComponent(
                    redirectUri
                  )}`;
                  setIsModalOpen(false);
                  window.location.href = url;
                }}
                className="w-full px-4 py-2 !bg-white text-gray-800 !rounded-sm hover:!bg-blue-100 mt-3 border-1 !border-gray-300 hover:!border-blue-100"
              >
                Sign in with GitHub
              </button>
            </div>
          </div>
        )}

        {/* Модалка добавления подписки */}
        {isAddModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsAddModalOpen(false)}
            />
            <div className="relative !bg-white rounded-lg shadow-lg p-6 w-[400px]">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-2 right-2 !text-black !bg-white hover:!text-red-500 hover:!border-white"
              >
                ✖
              </button>
              <h2 className="text-xl font-bold mb-4">{t("AddSubscription")}</h2>

              <form className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder={t("SubscriptionName")}
                  className="border p-2 rounded"
                />
                <input
                  type="number"
                  placeholder={t("Price")}
                  className="border p-2 rounded"
                />
                <select className="border p-2 rounded">
                  <option>{t("Software")}</option>
                  <option>{t("Music")}</option>
                  <option>{t("Education")}</option>
                  <option>{t("Video")}</option>
                  <option>{t("Games")}</option>
                </select>
                <input type="date" className="border p-2 rounded" />
                <select className="border p-2 rounded">
                  <option value="active">{t("ActiveSubs")}</option>
                  <option value="inactive">{t("InactiveSubs")}</option>
                </select>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 !bg-gray-300 rounded hover:!bg-gray-400"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 !bg-blue-500 text-white rounded hover:!bg-blue-600"
                  >
                    {t("Save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
