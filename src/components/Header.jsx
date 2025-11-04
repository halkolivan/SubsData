import { useState } from "react";
import {
  Lock,
  Settings,
  FileText,
  CirclePlus,
  LogIn,
  Globe,
} from "lucide-react";
import { User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context-export";
import { useGoogleLogin } from "@react-oauth/google";
import SaveButton from "@/components/SaveButton";

const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

export default function Header() {
  const { t, i18n } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const {
    user,
    login,
    logout,
    setIsAuthModalOpen,
    isAddModalOpen,
    setIsAddModalOpen,
    addSubscription,
  } = useAuth();
  const navigate = useNavigate();

  const changeLanguage = (lng) => {
    localStorage.setItem("i18nextLng", lng);
    i18n.changeLanguage(lng);
  };

  // Google Login с полными правами для Drive
  const loginWithGoogle = useGoogleLogin({
    scope:
      "email profile openid",
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        ).then((res) => res.json());

        login(
          {
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture,
          },
          tokenResponse.access_token
        );
        setIsModalOpen(false);
      } catch (err) {
        console.error("Ошибка при получении данных Google:", err);
      }
    },
    onError: () => console.log("Login Failed"),
  });

  return (
    <header className="flex justify-center w-auto sticky top-0 z-50">
      <nav className="flex flex-col sm:flex-row justify-between w-full min-h-[50px] items-center gap-3 p-2 bg-gradient-to-t from-gray-800 via-gray-400 to-gray-300">
        <div className="flex w-auto items-center justify-center">
          <NavLink to="/" className={"h-auto min-w-[150px]"}>
            <div
              className="text-[28px] hover:shadow-green-400 
            shadow-md shadow-sky-300 active:shadow-green-600 rounded-lg"
            >
              <span className="text-black">Subs</span>
              <span className="text-red-700 ">Data</span>
            </div>
          </NavLink>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:ml-[50px]">
          {/* Мои подписки — отключаем, если нет user */}
          <NavLink
            to={user ? "/mysubscriptions" : "#"}
            className={"hidden lg:flex "}
          >
            {({ isActive }) => (
              <h5
                className={
                  user
                    ? (isActive ? "text-blue-600" : "text-gray-700") +
                      " font-bold shadow-md shadow-sky-300 hover:shadow-green-400 p-3 rounded-lg whitespace-nowrap"
                    : " text-gray-500 cursor-not-allowed font-bold"
                }
                onClick={(e) => {
                  if (!user) e.preventDefault(); // блокируем переход
                }}
              >
                {t("Mysubscriptions")}
              </h5>
            )}
          </NavLink>

          <NavLink
            to={user ? "/mysubscriptions" : "#"}
            className="flex lg:hidden"
          >
            {({ isActive }) => (
              <FileText
                size={33}
                className={
                  user
                    ? isActive
                      ? "text-blue-700/90 cursor-pointer"
                      : "text-gray-900 cursor-pointer"
                    : "text-gray-500 cursor-not-allowed"
                }
                onClick={(e) => {
                  if (!user) e.preventDefault(); // блокируем переход
                }}
              />
            )}
          </NavLink>

          {/* Настройки — отключаем, если нет user */}
          <NavLink to={user ? "/settings" : "#"} className={"hidden lg:flex "}>
            {({ isActive }) => (
              <h5
                className={
                  user
                    ? (isActive ? "text-blue-600" : "text-gray-700") +
                      " font-bold shadow-md shadow-sky-300 hover:shadow-green-400 p-3 rounded-lg whitespace-nowrap"
                    : " text-gray-500 cursor-not-allowed font-bold"
                }
                onClick={(e) => {
                  if (!user) e.preventDefault(); // блокируем переход
                }}
              >
                {t("Settings")}
              </h5>
            )}
          </NavLink>

          <NavLink
            to={user ? "/settings" : "#"}
            className="flex lg:hidden whitespace-nowrap "
          >
            {({ isActive }) => (
              <Settings
                size={33}
                className={
                  user
                    ? isActive
                      ? "text-blue-700/90 cursor-pointer"
                      : "text-gray-900 cursor-pointer"
                    : "text-gray-500 cursor-not-allowed"
                }
                onClick={(e) => {
                  if (!user) e.preventDefault(); // блокируем переход
                }}
              />
            )}
          </NavLink>

          {/* Добавление подписки */}
          <h5
            className={
              user
                ? "cursor-pointer text-green-800 hover:text-green-900 font-bold  hidden lg:flex shadow-md shadow-sky-300 hover:shadow-green-400 p-3 rounded-lg whitespace-nowrap"
                : "text-gray-500 cursor-not-allowed font-bold hidden lg:flex"
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

          <CirclePlus
            size={33}
            className="text-gray-800 flex lg:hidden cursor-pointer active:text-green-700 hover:text-green-900"
            onClick={() => {
              if (user) {
                setIsAddModalOpen(true); // открыть модалку добавления подписки
              } else {
                setIsAuthModalOpen(true); // если не авторизован → показать окно входа
              }
            }}
          />

          {/* 🔒 Кнопка приватности */}
          <button
            onClick={() => setShowPrivacy(true)}
            className="flex min-h-[48px] items-center text-gray-700 hover:!text-gray-900 !font-bold hidden lg:flex hover:shadow-green-400 hover:!border-red-200/0
            shadow-md shadow-sky-300 active:shadow-green-600 rounded-lg !bg-gray-50/0 "
          >
            <Lock className="!bg-gray-50/0" />
            {t("Privacy")}
          </button>
          <Lock
            size={33}
            className="text-gray-800 flex lg:hidden cursor-pointer"
            onClick={() => setShowPrivacy(true)}
          />

          {/* Sign In / Sign Out */}
          {user ? (
            <div className="flex flex-nowrap shadow-md shadow-sky-300 hover:shadow-green-400 p-3 rounded-lg">
              <h5
                className="cursor-pointer text-gray-800 hover:text-gray-900 font-semibold hidden lg:flex whitespace-nowrap"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                {t("SignOut")} ({user.name})
              </h5>
              <User
                size={23}
                className="text-yellow-700 cursor-pointer hover:text-yellow-600 transition-transform duration-150 hover:scale-110"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              />
            </div>
          ) : (
            <>
              <h5
                className="cursor-pointer hover:text-yellow-600 font-semibold text-yellow-800 hidden lg:flex shadow-md shadow-sky-300 hover:shadow-green-400 p-3 rounded-lg"
                onClick={() => setIsModalOpen(true)}
              >
                {t("SignIn")}
              </h5>
              <LogIn
                size={33}
                className="flex lg:hidden text-gray-800"
                onClick={() => setIsModalOpen(true)}
              />
            </>
          )}

          {/* Переключатель языков */}
          <div className="flex items-center hidden lg:flex min-h-[48px]">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="min-h-[48px] border rounded px-2 py-1 text-sm !bg-gray-400/20 shadow-md shadow-sky-300 text-gray-700 !font-bold
              hover:border-blue-50/0 border-blue-50/0 hover:shadow-green-400 cursor-pointer"
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
          <div className="flex lg:hidden relative">
            <Globe
              size={33}
              className="text-gray-800 cursor-pointer active:text-blue-700/70"
              onClick={() => setShowLangMenu(!showLangMenu)}
            />

            {/* Выпадающее меню под иконкой */}
            {showLangMenu && (
              <div className="absolute top-8 right-0 bg-gray-200 rounded shadow-md p-2">
                <select
                  value={i18n.language}
                  onChange={(e) => {
                    changeLanguage(e.target.value);
                    setShowLangMenu(false); // закрываем после выбора
                  }}
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
            )}
          </div>
        </div>

        {/* Модалка приватности */}
        {showPrivacy && (
          <div className="fixed flex items-center justify-center bg-black/50 inset-0 !z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full text-gray-700 !z-50 bg-gradient-to-t from-gray-800 via-gray-500 to-gray-800">
              <h2 className="text-lg font-semibold mb-3 text-gray-300">
                {t("Privacy")}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
                <li>{t("PrivacyLocal")}</li>
                <li>{t("PrivacyNoServer")}</li>
                <li>{t("PrivacyGDPR")}</li>
              </ul>
              <button
                onClick={() => setShowPrivacy(false)}
                className="mt-4 px-4 py-2 text-white rounded !bg-gray-800 hover:!bg-gray-700"
              >
                {t("Close")}
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
            <div className="relative bg-gradient-to-t from-gray-800 via-gray-500 to-gray-800 rounded-lg shadow-lg p-6 w-[400px]">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-2 right-2 !text-black !bg-gray-700/0 hover:!text-red-500 hover:!border-white"
              >
                ✖
              </button>
              <h2 className="text-xl font-bold mb-4">{t("AddSubscription")}</h2>

              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target;

                  const newSub = {
                    name: form[0].value,
                    price: parseFloat(form[1].value) || 0,
                    category: form[2].value,
                    nextPayment: form[3].value,
                    status: form[4].value,
                    currency: "USD",
                  };

                  addSubscription(newSub);
                  setIsAddModalOpen(false);
                }}
              >
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
                <select className="border p-2 rounded bg-gray-500">
                  <option>{t("Software")}</option>
                  <option>{t("Music")}</option>
                  <option>{t("Education")}</option>
                  <option>{t("Video")}</option>
                  <option>{t("Games")}</option>
                </select>
                <input type="date" className="border p-2 rounded" />
                <select className="border p-2 rounded bg-gray-500">
                  <option value="active">{t("ActiveSubs")}</option>
                  <option value="inactive">{t("InactiveSubs")}</option>
                </select>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded !bg-gray-800 hover:!bg-gray-700"
                  >
                    {t("Cancel")}
                  </button>
                  <SaveButton />
                </div>
              </form>
            </div>
          </div>
        )}
      </nav>
      {/* Модальное окно авторизации */}
      {isModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center z-50 ">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-lg p-6 w-[400px] bg-gradient-to-t from-gray-800 via-gray-500 to-gray-800">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 !text-black hover:!text-red-500 !bg-white/0 hover:!border-white/0"
            >
              ✖
            </button>
            <h2 className="text-xl font-bold mb-4">{t("SignIn")}</h2>
            <p className="text-gray-600 mb-4">{t("ChooseAuthMethod")}</p>

            {/* Google Auth */}
            <button
              onClick={() => loginWithGoogle()}
              className="w-full px-4 py-2 !bg-gray-800 hover:!bg-gray-700 text-white rounded-sm mt-3 border !border-gray-400"
            >
              {t("SignInWithGoogle")}
            </button>

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
              className="w-full px-4 py-2 !bg-gray-800 hover:!bg-gray-700 text-white !rounded-sm mt-3 border-1 !border-gray-400"
            >
              {t("SignInWithGitHub")}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
