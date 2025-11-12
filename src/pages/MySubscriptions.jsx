import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth-context-export";
import { formatDate, formatPrice } from "@/utils/formatUtils";
// import SendByEmailButton from "@components/SendByEmailButton";

export default function MySubscriptions() {
  const { subscriptions, setIsAddModalOpen, setSubscriptions, settings } =
    useAuth();
  const { t } = useTranslation();

  const [sortRevers, setSortRevers] = useState(true);
  const [sortAscName, setSortAscName] = useState(true);
  const [sortAscDate, setSortAscDate] = useState(true);
  const [sortAscCategory, setSortAscCategory] = useState(true);
  const [sortActiveStatus, setSortActiveStatus] = useState(true);

  // --- состояния для удаления ---
  const [toDeleteId, setToDeleteId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // --- состояния для редактирования ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  // --- функции удаления ---
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

  // --- функции редактирования ---
  const openEditModal = (sub) => {
    setEditData({ ...sub });
    setIsEditOpen(true);
  };

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = () => {
    setSubscriptions((prev) =>
      prev.map((sub) => (sub.id === editData.id ? editData : sub))
    );
    setIsEditOpen(false);
    setEditData(null);
  };

  // --- сортировка ---
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

  // --- статистика ---
  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const canceledCount = subscriptions.filter(
    (s) => s.status === "canceled"
  ).length;

  return (
    <>
      <Helmet>
        <title>{t("Mysubscriptions")} — SubsData</title>
        <meta
          name="description"
          content="Измените параметры аккаунта и синхронизации в SubsData."
        />
      </Helmet>
      <div className="flex flex-col gap-3 w-full h-full bg-gray-800 p-4 justify-start items-center">
        <span className="text-[20px]">{t("Mysubscriptions")}</span>
        <div className="flex gap-6 text-sm text-green-600 w-full justify-center ">
          <span>
            {t("CountSubs")}: {totalCount}
          </span>
          <span className=" text-yellow-600">
            {t("ActiveSubs")}: {activeCount}
          </span>
          <span className=" text-gray-500">
            {t("Canceled")}: {canceledCount}
          </span>
        </div>

        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-600 gap-4">
            <p className="mb-4 text-gray-500">{t("NoSubscriptions")}</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 !bg-blue-500 text-gray-200 rounded hover:!bg-blue-600"
            >
              {t("AddFirstSubscription")}
            </button>
          </div>
        ) : (
          <>
            {/* <SendByEmailButton subscriptions={subscriptions} /> */}
            <div className="overflow-x-auto flex flex-col w-full justify-center">
              <table className="w-full">
                <thead className="border-b-2">
                  <tr>
                    <th>
                      <button
                        onClick={sortByName}
                        className="!bg-gray-200/0 !border-gray-200/0 hover:text-blue-500"
                      >
                        {t("Subscriptions")} {sortAscName ? "↑" : "↓"}
                      </button>
                    </th>
                    <th>
                      <button
                        onClick={sortByPrice}
                        className="!bg-gray-200/0 !border-gray-200/0 hover:text-blue-500"
                      >
                        {t("Price")} {sortRevers ? "↑" : "↓"}
                      </button>
                    </th>
                    <th>
                      <button
                        onClick={sortByCategory}
                        className="!bg-gray-200/0 !border-gray-200/0 hover:text-blue-500"
                      >
                        {t("Category")} {sortAscCategory ? "↑" : "↓"}
                      </button>
                    </th>
                    <th>
                      <button
                        onClick={sortByDate}
                        className="!bg-gray-200/0 !border-gray-200/0 hover:text-blue-500"
                      >
                        {t("NextPayment")} {sortAscDate ? "↑" : "↓"}
                      </button>
                    </th>
                    <th>
                      <button
                        onClick={sortByStatus}
                        className="!bg-gray-200/0 !border-gray-200/0 hover:text-blue-500"
                      >
                        {t("Status")} {sortActiveStatus ? "↑" : "↓"}
                      </button>
                    </th>
                    <th>{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="border-r-2 border-b-1">{sub.name}</td>
                      <td className="border-r-2 border-b-1">
                        {formatPrice(sub, settings)}
                      </td>
                      <td className="border-r-2 border-b-1">
                        {t(sub.category)}
                      </td>
                      <td className="border-r-2 border-b-1">
                        {formatDate(sub.nextPayment, settings)}
                      </td>
                      <td
                        className={`border-b-2 !border-gray-400 ${
                          sub.status === "active"
                            ? "text-green-500"
                            : "text-yellow-500"
                        }`}
                      >
                        {sub.status}
                      </td>
                      <td className="border-b-1 text-center gap-2 justify-center whitespace-nowrap border-l-2">
                        <button
                          onClick={() => openEditModal(sub)}
                          className="px-3 py-1 !bg-gray-200/0 text-blue-600 rounded hover:!border-gray-200/0 hover:!bg-gray-600"
                        >
                          {t("Edit")}
                        </button>
                        <button
                          onClick={() => {
                            setToDeleteId(sub.id);
                            setIsConfirmOpen(true);
                          }}
                          className="px-3 py-1 !bg-gray-200/0 text-red-600 rounded hover:!border-gray-200/0 hover:!bg-gray-600"
                        >
                          {t("Delete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Модалка подтверждения удаления */}
        {isConfirmOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 ">
            <div className="bg-gray-600 p-6 rounded-xl shadow-xl max-w-sm w-full bg-gradient-to-t from-gray-800 via-gray-500 to-gray-800">
              <p className="mb-4">{t("ConfirmDeleteMessage")}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 !bg-gray-800 rounded hover:!bg-gray-700"
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

        {/* Модалка редактирования */}
        {isEditOpen && editData && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full flex flex-col gap-4 bg-gradient-to-t from-gray-800 via-gray-500 to-gray-800">
              <h3 className="text-lg font-semibold">{t("EditSubscription")}</h3>
              <input
                className="border p-2 rounded"
                value={editData.name}
                onChange={(e) => handleEditChange("name", e.target.value)}
                placeholder={t("Name")}
              />
              <input
                type="number"
                className="border p-2 rounded"
                value={editData.price}
                onChange={(e) => handleEditChange("price", +e.target.value)}
                placeholder={t("Price")}
              />
              <input
                className="border p-2 rounded"
                value={editData.category}
                onChange={(e) => handleEditChange("category", e.target.value)}
                placeholder={t("Category")}
              />
              <input
                type="date"
                className="border p-2 rounded"
                value={editData.nextPayment}
                onChange={(e) =>
                  handleEditChange("nextPayment", e.target.value)
                }
              />
              <select
                className="border p-2 rounded bg-gray-500"
                value={editData.status}
                onChange={(e) => handleEditChange("status", e.target.value)}
              >
                <option value="active">{t("Active")}</option>
                <option value="canceled">{t("Canceled")}</option>
              </select>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 !bg-gray-800 rounded hover:!bg-gray-700"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 !bg-blue-500 text-white rounded hover:!bg-blue-600"
                >
                  {t("Save")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
