import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function Settings() {
  const { t } = useTranslation();
  const [active, setActive] = useState("notification");
  const [dateFormat, setDateFormat] = useState("DD.MM.YYYY"); // значение по умолчанию
  const [dateMsg, setDateMsg] = useState("");

  // список пунктов меню
  const menuItems = [    
    { key: "notification", label: t("NotificationTime") },
    { key: "currency", label: t("Currency") },
    { key: "dateformat", label: t("DateFormat") },
  ];

  // --- state для Времени уведомлений (frontend only) ---
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifTime, setNotifTime] = useState("09:00");
  const [notifFrequency, setNotifFrequency] = useState("daily"); // daily | weekdays | weekly
  const [weeklyDays, setWeeklyDays] = useState({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  });
  const [notifMsg, setNotifMsg] = useState("");

  // --- state для Валют (frontend only) ---
  const currencyList = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "RUB", symbol: "₽" },
    { code: "MDL", symbol: "L" },
    { code: "GBP", symbol: "£" },
  ];
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [showOriginalCurrency, setShowOriginalCurrency] = useState(true);
  const [rates, setRates] = useState({
    USD: 1,
    EUR: 0.92,
    RUB: 80,
    MDL: 18.0,
    GBP: 0.79,
  });
  const [currencyMsg, setCurrencyMsg] = useState("");
  const [customCurrency, setCustomCurrency] = useState("");

  // --- state для Логин/пароль (frontend only) ---
  function handleLpSubmit(e) {
    e.preventDefault();
    setLpError("");
    setLpSuccess("");

    // простая frontend-валидация
    if (!currentPassword) {
      setLpError("Введите текущий пароль для подтверждения");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setLpError("Новый пароль должен быть минимум 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLpError("Новый пароль и подтверждение не совпадают");
      return;
    }

    // Здесь должен быть вызов API: отправить currentPassword, newLogin, newPassword
    // Пока фронтенд-симуляция:
    setLpSuccess(
      "Данные изменены (симуляция). Подключите реальный API на бэкенде."
    );
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  // переключение дней недели для еженедельных уведомлений
  function toggleWeeklyDay(day) {
    setWeeklyDays((prev) => ({ ...prev, [day]: !prev[day] }));
  }

  // обработка сохранения настроек уведомлений
  function handleNotifSave(e) {
    e?.preventDefault();
    setNotifMsg("");

    if (!notifEnabled) {
      setNotifMsg("Уведомления выключены");
      return;
    }

    if (!notifTime) {
      setNotifMsg("Выберите время уведомления");
      return;
    }

    if (notifFrequency === "weekly") {
      const atLeastOne = Object.values(weeklyDays).some(Boolean);
      if (!atLeastOne) {
        setNotifMsg(
          "Выберите хотя бы один день недели для еженедельных уведомлений"
        );
        return;
      }
    }

    // Тут -- отправка настроек на бэкенд. Сейчас симуляция.
    setNotifMsg(
      "Настройки уведомлений сохранены (симуляция). Подключите бэкенд для реального сохранения."
    );
  }

  // --- Валюты: простая конвертация (frontend simulation) ---
  function convert(amount, from, to) {
    // rates: относительные к USD
    const rateFrom = rates[from] ?? 1;
    const rateTo = rates[to] ?? 1;
    const inUSD = amount / rateFrom; // перевести в USD
    const converted = inUSD * rateTo;
    return Number(converted.toFixed(2));
  }

  // обработка сохранения настроек валюты
  function handleCurrencySave(e) {
    e?.preventDefault();
    setCurrencyMsg("");

    if (!defaultCurrency) {
      setCurrencyMsg("Выберите валюту по умолчанию");
      return;
    }

    // симуляция: если пользователь ввёл кастомную валюту (код и курс через двоеточие, напр. XYZ:1.7)
    if (customCurrency) {
      const parts = customCurrency.split(":");
      if (parts.length !== 2 || !parts[0] || Number.isNaN(Number(parts[1]))) {
        setCurrencyMsg(
          "Кастомная валюта должна быть в формате CODE:курс (например XYZ:1.7)"
        );
        return;
      }
      const code = parts[0].toUpperCase();
      const val = Number(parts[1]);
      setRates((prev) => ({ ...prev, [code]: val }));
      setCurrencyMsg(`Кастомная валюта ${code} добавлена (симуляция)`);
      setCustomCurrency("");
      return;
    }

    // здесь можно отправлять настройки на бэкенд
    setCurrencyMsg("Настройки валюты сохранены (симуляция)");
  }

  // --- Формат даты ---
  function formatPreview(date, format) {
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();

    switch (format) {
      case "DD.MM.YYYY":
        return `${dd}.${mm}.${yyyy}`;
      case "MM/DD/YYYY":
        return `${mm}/${dd}/${yyyy}`;
      case "YYYY-MM-DD":
        return `${yyyy}-${mm}-${dd}`;
      case "D MMM YYYY":
        return d.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      case "D MMMM YYYY":
        return d.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      default:
        return d.toLocaleDateString();
    }
  }

  return (
    <div className="flex flex-col w-full bg-gray-100 bg-gray-200 pt-4 pb-4">
      <div className="flex w-full justify-center mb-4">
        <p className="text-[20px]">{t("Settings")}</p>
      </div>
      <div className="flex flex-row w-full gap-3">
        {/* Левое меню */}
        <div className="flex flex-col w-1/3 space-y-2 ml-4">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`pl-4 text-left py-2 rounded-md transition-colors duration-200 !bg-gray-200 hover:!border-gray-200
                ${
                  active === item.key
                    ? "bg-blue-500 text-black"
                    : "hover:bg-blue-200 text-gray-400"
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {/* Правая панель */}
        <div className="flex w-2/3 bg-gray-200  mr-4 items-center justify-center rounded-md p-4">          

          {/* Время уведомл */}
          {active === "notification" && (
            <form
              className="flex flex-col w-full max-w-md space-y-4"
              onSubmit={handleNotifSave}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("Notifications")}</p>
                  <p className="text-sm text-green-700">
                    {t("Enable/disableAndPush/email")}
                  </p>
                </div>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={notifEnabled}
                    onChange={(e) => setNotifEnabled(e.target.checked)}
                    className="form-checkbox h-5 w-5"
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm mb-1">
                  {t("NotificationTime")}
                </label>
                <input
                  type="time"
                  value={notifTime}
                  onChange={(e) => setNotifTime(e.target.value)}
                  className="w-40 p-2 rounded-md border border-gray-300 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">{t("Frequency")}</label>
                <select
                  value={notifFrequency}
                  onChange={(e) => setNotifFrequency(e.target.value)}
                  className="w-48 p-2 rounded-md border border-gray-300 dark:border-gray-600"
                >
                  <option value="daily">{t("Daily")}</option>
                  <option value="weekdays">{t("WorkingDays")}</option>
                  <option value="weekly">{t("Weekly")}</option>
                </select>
              </div>
              {notifFrequency === "weekly" && (
                <div>
                  <label className="block text-sm mb-1">{t("Weekday")}</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(weeklyDays).map(([key, val]) => (
                      <label
                        key={key}
                        className="inline-flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={val}
                          onChange={() => toggleWeeklyDay(key)}
                          className="form-checkbox h-4 w-4"
                        />
                        <span className="text-sm">{key.toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {notifMsg && (
                <div className="text-sm text-green-700">{notifMsg}</div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="!bg-blue-500 hover:!bg-blue-600 !text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
                >
                  {t("Save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // сброс к дефолтным фронтэнд-значениям
                    setNotifEnabled(true);
                    setNotifTime("09:00");
                    setNotifFrequency("daily");
                    setWeeklyDays({
                      mon: true,
                      tue: true,
                      wed: true,
                      thu: true,
                      fri: true,
                      sat: false,
                      sun: false,
                    });
                    setNotifMsg("");
                  }}
                  className="hover:!text-gray-200 text-white hover:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  {t("Reset")}
                </button>
              </div>
            </form>
          )}

          {/* ВАЛЮТА */}
          {active === "currency" && (
            <form
              className="flex flex-col w-full max-w-md space-y-4"
              onSubmit={handleCurrencySave}
            >
              <div>
                <p className="font-medium">{t("AccountingCurrency")}</p>
                <p className="text-sm text-green-700">
                  {t("ToolTipCurrency1")}
                </p>
              </div>
              <div>
                <label className="block text-sm mb-1">
                  {t("DefaultCurrency")}
                </label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-48 p-2 rounded-md border border-gray-300 dark:border-gray-600"
                >
                  {currencyList.map((c) => (
                    <option
                      key={c.code}
                      value={c.code}
                    >{`${c.code} ${c.symbol}`}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOriginalCurrency}
                  onChange={(e) => setShowOriginalCurrency(e.target.checked)}
                  className="form-checkbox h-4 w-4"
                />
                <span className="text-sm">{t("ToolTipCurrency4")}</span>
              </div>

              <div>
                <label className="block text-sm mb-1">
                  {t("ToolTipCurrency5")}
                </label>
                <p className="text-xs text-green-700  mb-1">
                  {t("ToolTipCurrency2")}
                </p>
                <input
                  value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value)}
                  placeholder={t("ToolTipCurrency6")}
                  className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">
                  {t("ExampleOfConversion")}
                </p>
                <p className="text-sm text-gray-700">
                  10 USD → {defaultCurrency}:{" "}
                  {convert(10, "USD", defaultCurrency)} {defaultCurrency}
                </p>
              </div>

              {currencyMsg && (
                <div className="text-sm text-green-700">{currencyMsg}</div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="!bg-blue-500 hover:!bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
                >
                  {t("Save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultCurrency("USD");
                    setShowOriginalCurrency(true);
                    setCustomCurrency("");
                    setCurrencyMsg("");
                  }}
                  className=" text-white  py-2 px-4 rounded-md hover:!text-gray-200 transition"
                >
                  {t("Reset")}
                </button>
              </div>

              <span className="text-xs !text-green-700 mt-2">
                {t("ToolTipCurrency3")}
              </span>
            </form>
          )}

          {/* ФОРМАТ ДАТЫ */}
          {active === "dateformat" && (
            <form className="flex flex-col w-full max-w-md space-y-4">
              <div>
                <p className="font-medium">{t("DateFormat")}</p>
                <p className="text-sm text-green-700 ">{t("ToolTipFD1")}</p>
              </div>

              <div>
                <label className="block text-sm mb-1">{t("ToolTipFD2")}</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-60 p-2 rounded-md border border-gray-300 dark:border-gray-600"
                >
                  <option value="DD.MM.YYYY">30.09.2025</option>
                  <option value="MM/DD/YYYY">09/30/2025</option>
                  <option value="YYYY-MM-DD">2025-09-30</option>
                  <option value="D MMM YYYY">30 {t("September1")} 2025</option>
                  <option value="D MMMM YYYY">30 {t("September")} 2025</option>
                </select>
              </div>

              <div className="text-sm text-gray-700 ">
                {t("Example")}:{" "}
                <span className="font-medium">
                  {formatPreview("2025-09-30", dateFormat)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDateMsg(t("ToolTipCurrency7"))}
                className="!bg-blue-500 hover:!bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
              >
                {t("Save")}
              </button>

              {dateMsg && (
                <div className="text-sm text-green-700 ">{dateMsg}</div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
