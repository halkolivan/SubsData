import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { subscriptions as mockSubs } from "@mock/mockData";
import { formatDate, formatPrice } from "@/utils/formatUtils";

export default function Home() {
  const { t } = useTranslation();
  const { subscriptions, settings, user } = useAuth();
  const totalSubs = subscriptions.length;
  const subSum = subscriptions.reduce((acc, sub) => acc + sub.price, 0);
  const [showDemoNotice, setShowDemoNotice] = useState(
    subscriptions.length === 0
  );
  const activeSubsCount = subscriptions.filter(
    (sub) => sub.status === "active"
  ).length;

  // 1. Фильтруем, сортируем и выводим только ближайшие подписки с окончанием времени
  const sourceSubs = subscriptions.length ? subscriptions : mockSubs;
  const subActive = sourceSubs
    .filter((sub) => sub.status === "active")
    .sort((a, b) => new Date(a.nextPayment) - new Date(b.nextPayment))
    .slice(0, 3);

  // --- 1. Сумма по категориям (pie) ---
  const categoryTotals = subscriptions.reduce((acc, sub) => {
    if (sub.status !== "active") return acc;
    acc[sub.category] = (acc[sub.category] || 0) + sub.price;
    return acc;
  }, {});

  const categoryOption = {
    title: { text: t("ExpensesByCategory"), left: "center" },
    tooltip: {
      trigger: "item",
      formatter: ({ name, value, percent }) =>
        `${name}: ${Number(value).toFixed(2)} $ (${percent}%)`,
    },
    legend: { orient: "horizontal", left: "left", top: 20 },
    series: [
      {
        type: "pie",
        radius: "45%",
        top: 40,
        data: Object.entries(categoryTotals).map(([cat, val]) => ({
          name: t(cat),
          value: Math.round((val + Number.EPSILON) * 100) / 100,
        })),
        label: {
          formatter: "{b}: {c} $",
        },
      },
    ],
  };

  // --- 2. По сервисам (bar) ---
  const activeSubs = subscriptions.filter((s) => s.status === "active");

  const serviceOption = {
    title: { text: t("TopSubsByPrice"), left: "center" },
    tooltip: {
      trigger: "axis",
      formatter: (params) =>
        params
          .map((p) => `${p.name}: ${Number(p.value).toFixed(2)} $`)
          .join("<br/>"),
    },
    xAxis: { type: "category", data: activeSubs.map((s) => t(s.name)) },
    yAxis: { type: "value" },
    series: [
      {
        data: activeSubs.map(
          (s) => Math.round((s.price + Number.EPSILON) * 100) / 100
        ),
        type: "bar",
      },
    ],
  };

  // --- 3. По месяцам (line) ---
  const monthlyTotals = {};
  subscriptions.forEach((sub) => {
    if (sub.status !== "active") return;
    const date = new Date(sub.nextPayment);
    const monthIndex = date.getMonth(); // 0–11
    const year = date.getFullYear();

    const monthKeys = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const label = `${t(monthKeys[monthIndex])} ${year}`;
    monthlyTotals[label] = (monthlyTotals[label] || 0) + sub.price;
  });

  const monthlyOption = {
    title: { text: t("PaymentsByMonth"), left: "center" },
    tooltip: {
      trigger: "axis",
      formatter: (params) =>
        params
          .map((p) => `${p.axisValue}: ${Number(p.value).toFixed(2)} $`)
          .join("<br/>"),
    },
    xAxis: { type: "category", data: Object.keys(monthlyTotals) },
    yAxis: { type: "value" },
    series: [
      {
        data: Object.values(monthlyTotals).map(
          (val) => Math.round((val + Number.EPSILON) * 100) / 100
        ),
        type: "line",
        smooth: true,
      },
    ],
  };

  //Убрать/показать сообщение
  useEffect(() => {
    // если подписки появились — убираем уведомление
    if (subscriptions.length > 0) {
      setShowDemoNotice(false);
    } else {
      setShowDemoNotice(true);
    }
  }, [subscriptions]);

  return (
    <div className="flex h-full w-full bg-gray-200">
      <div className="flex flex-col items-start w-full mt-4 pr-4 pl-4">
        {showDemoNotice && (
          <div className="flex items-center w-full justify-center gap-2 bg-blue-100 text-blue-800 p-3 rounded-lg shadow mb-4">
            <Info className="w-5 h-5" />
            <span>{t("DemoNotice")}</span>
          </div>
        )}

        <div className="flex flex-col w-full mb-4 border-b-2 pb-3">
          <div className="flex flex-col w-full mb-4">
            <h2>{t("SumSubs")}</h2>
            <span className="text-[40px]">{subSum.toFixed(2)} $</span>
          </div>
          <p className="text-[20px]">
            {t("CountSubs")} : {totalSubs}
          </p>
          <h2>
            {t("ActiveSubs")} : {activeSubsCount}
          </h2>
        </div>
        <div className="flex w-full mb-4">
          <div className="flex flex-col w-full overflow-x-auto">
            <p className="mb-3">{t("UpcomingPayments")}</p>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="border-b-2 p-1 text-sm">
                    {t("Subscriptions")}
                  </th>
                  <th className="border-b-2 p-1 text-sm">{t("Price")}</th>
                  <th className="border-b-2 p-1 text-sm">{t("Category")}</th>
                  <th className="border-b-2 p-1 text-sm">{t("NextPayment")}</th>
                  <th className="border-b-2 p-1 text-sm">{t("Status")}</th>
                </tr>
              </thead>
              {subActive.map((sub) => (
                <tbody className="w-full mb-5" key={sub.id}>
                  <tr>
                    <td className="border-b-1">{sub.name}</td>
                    <td className="border-b-1 whitespace-nowrap text-right">
                      {formatPrice(sub, settings)}
                    </td>
                    <td className="border-b-1">{t(sub.category)}</td>
                    <td className="border-b-1">
                      {formatDate(sub.nextPayment, settings)}
                    </td>
                    <td
                      className={`border-b-1 border-gray-800 ${
                        sub.status === "active"
                          ? "text-green-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {sub.status}
                    </td>
                  </tr>
                </tbody>
              ))}
            </table>
          </div>
        </div>
        <div className="flex flex-col w-full h-full mt-5">
          <ReactECharts
            option={categoryOption}
            className="max-h-[400px] mb-5 border-b-1"
          />
          <ReactECharts
            option={serviceOption}
            className="max-h-[400px] border-b-1"
          />
          <div className="col-span-2">
            <ReactECharts
              option={monthlyOption}
              className="max-h-[400px] mt-5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
