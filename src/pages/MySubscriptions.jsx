import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

export default function MySubscriptions() {
  const auth = useAuth();

  // если контекст ещё не готов — выходим
  if (!auth) return null;
  
  const { t } = useTranslation();
  const {
    subscriptions,
    setIsAddModalOpen,
    loadMockSubscriptions,
    setSubscriptions,
  } = useAuth();
  const [sortRevers, setSortRevers] = useState(true);
  const [sortAscName, setSortAscName] = useState(true);
  const [sortAscDate, setSortAscDate] = useState(true);
  const [sortAscCategory, setSortAscCategory] = useState(true);
  const [sortActiveStatus, setSortActiveStatus] = useState(true);

  // новое состояние для модалки
  const [toDeleteId, setToDeleteId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // функция для открытия модалки удаления
  const deleteSubscription = (id) => {
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
  };

  const confirmDelete = () => {
    if (toDeleteId !== null) {
      deleteSubscription(toDeleteId);
      setToDeleteId(null);
      setIsConfirmOpen(false);
    }
  };

  const cancelDelete = () => {
    setToDeleteId(null);
    setIsConfirmOpen(false);
  };

  // Сортировка ---------------------------------------------------------------------
  const sortByPrice = () => {
    const sorted = [...subscriptions].sort((a, b) =>
      sortRevers ? a.price - b.price : b.price - a.price
    );
    setSubscriptions(sorted);
    setSortRevers(!sortRevers);
  };

  const sortByName = () => {
    const sorted = [...subscriptions].sort((a, b) =>
      sortAscName ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
    setSubscriptions(sorted);
    setSortAscName(!sortAscName);
  };

  const sortByStatus = () => {
    const sorted = [...subscriptions].sort((a, b) =>
      sortActiveStatus
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status)
    );
    setSubscriptions(sorted);
    setSortActiveStatus(!sortActiveStatus);
  };

  const sortByDate = () => {
    const sorted = [...subscriptions].sort((a, b) =>
      sortAscDate
        ? new Date(a.nextPayment) - new Date(b.nextPayment)
        : new Date(b.nextPayment) - new Date(a.nextPayment)
    );
    setSubscriptions(sorted);
    setSortAscDate(!sortAscDate);
  };

  const sortByCategory = () => {
    const sorted = [...subscriptions].sort((a, b) =>
      sortAscCategory
        ? a.category.localeCompare(b.category)
        : b.category.localeCompare(a.category)
    );
    setSubscriptions(sorted);
    setSortAscCategory(!sortAscCategory);
  };
  // -------------------------------------------------------------------------------

  // Статистика подписок
  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const canceledCount = subscriptions.filter(
    (s) => s.status === "canceled"
  ).length;

  return (
    <div className="flex flex-col gap-3 w-full bg-gray-200 p-4">
      <span className="text-[20px]">{t("Mysubscriptions")}</span>
      <div className="flex gap-6 text-sm text-green-600 w-full justify-center ">
        <span>
          {t("CountSubs")}: {totalCount}
        </span>
        <span className=" text-yellow-600">
          {t("ActiveSubs")}: {activeCount}
        </span>
        <span className=" text-gray-700">
          {t("Canceled")}: {canceledCount}
        </span>
      </div>

      {subscriptions.length === 0 ? (
        // Заглушка если нет подписок
        <div className="flex flex-col items-center justify-center py-10 text-gray-600 gap-4">
          <p className="mb-4">{t("NoSubscriptions")}</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 !bg-blue-500 text-white rounded hover:!bg-blue-600"
          >
            {t("AddFirstSubscription")}
          </button>
          {/* кнопка загрузки демо-данных */}
          <button
            onClick={loadMockSubscriptions}
            className="px-4 py-2 !bg-blue-500 text-white rounded hover:!bg-blue-600 "
          >
            {t("LoadDemoData")}
          </button>
        </div>
      ) : (
        // Таблица если подписки есть
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b-2">
              <tr>
                <th>
                  <button
                    onClick={sortByName}
                    className="!bg-gray-200 !border-gray-200 hover:text-blue-500"
                  >
                    {t("Subscriptions")} {sortAscName ? "↑" : "↓"}
                  </button>
                </th>
                <th>
                  <button
                    onClick={sortByPrice}
                    className="!bg-gray-200 !border-gray-200 hover:text-blue-500"
                  >
                    {t("Price")} {sortRevers ? "↑" : "↓"}
                  </button>
                </th>
                <th>
                  <button
                    onClick={sortByCategory}
                    className="!bg-gray-200 !border-gray-200 hover:text-blue-500"
                  >
                    {t("Category")} {sortAscCategory ? "↑" : "↓"}
                  </button>
                </th>
                <th>
                  <button
                    onClick={sortByDate}
                    className="!bg-gray-200 !border-gray-200 hover:text-blue-500"
                  >
                    {t("NextPayment")} {sortAscDate ? "↑" : "↓"}
                  </button>
                </th>
                <th>
                  <button
                    onClick={sortByStatus}
                    className="!bg-gray-200 !border-gray-200 hover:text-blue-500"
                  >
                    {t("Status")} {sortActiveStatus ? "↑" : "↓"}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td className="border-r-2 border-b-1">{sub.name}</td>
                  <td className="border-r-2 border-b-1">
                    {sub.price} {sub.currency}
                  </td>
                  <td className="border-r-2 border-b-1">{t(sub.category)}</td>
                  <td className="border-r-2 border-b-1">{sub.nextPayment}</td>
                  <td
                    className={`border-b-1 !border-gray-800 ${
                      sub.status === "active"
                        ? "text-green-500"
                        : "text-yellow-500"
                    }`}
                  >
                    {sub.status}
                  </td>
                  <td className="border-b-1 text-center">
                    <button
                      onClick={() => {
                        setToDeleteId(sub.id);
                        setIsConfirmOpen(true);
                      }}
                      className="px-3 py-1 !bg-gray-200 text-red-600 rounded hover:!border-gray-200"
                    >
                      {t("Delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка подтверждения */}
      {isConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
            <p className="mb-4">{t("ConfirmDeleteMessage")}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 !bg-gray-300 rounded hover:!bg-gray-400"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 !bg-red-500 text-white rounded hover:!bg-red-600"
              >
                {t("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
