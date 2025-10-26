import * as echarts from "echarts";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth-context-export";
import { subscriptions as mockSubs } from "@mock/mockData";
import { formatDate, formatPrice } from "@/utils/formatUtils";

export default function Home() {
  const { t } = useTranslation();
  const { subscriptions, settings } = useAuth();
  const sourceSubs = subscriptions.length ? subscriptions : mockSubs;
  const totalSubs = sourceSubs.length;
  const subSum = sourceSubs.reduce((acc, sub) => acc + sub.price, 0);
  const [showDemoNotice, setShowDemoNotice] = useState(
    subscriptions.length === 0
  );
  const activeSubsCount = sourceSubs.filter(
    (sub) => sub.status === "active"
  ).length;

  // 1. Фильтруем, сортируем и выводим только ближайшие подписки с окончанием времени
  const subActive = sourceSubs
    .filter((sub) => sub.status === "active")
    .sort((a, b) => new Date(a.nextPayment) - new Date(b.nextPayment))
    .slice(0, 3);

  // --- 1. Сумма по категориям (pie) ---
  const categoryTotals = sourceSubs.reduce((acc, sub) => {
    if (sub.status !== "active") return acc;
    acc[sub.category] = (acc[sub.category] || 0) + sub.price;
    return acc;
  }, {});

  const neonColors = [
  ["#00eaff", "#0078ff"], // голубой
  ["#00ffb0", "#00eaff"], // бирюзовый
  ["#ff00f0", "#0078ff"], // пурпурный
  ["#f6ff00", "#00ffea"], // неон-жёлтый
  ["#ff6ec7", "#ff00ff"], // розовый
];


  const categoryOption = {
    title: {
      text: t("ExpensesByCategory"),
      left: "center",
      textStyle: { color: "rgba(218, 218, 218, 0.87)" },
    },
    tooltip: {
      trigger: "item",
      formatter: ({ name, value, percent }) =>
        `${name}: ${Number(value).toFixed(2)} $ (${percent}%)`,
    },
    legend: {
      orient: "horizontal",
      left: "center",
      top: 40,
      textStyle: { color: "rgba(218, 218, 218, 0.87)" },
    },
    series: [
      {
        type: "pie",
        radius: ["35%", "55%"],
        top: 40,
        avoidLabelOverlap: false,
        data: Object.entries(categoryTotals).map(([cat, val], index) => ({
          name: t(cat),
          value: Math.round((val + Number.EPSILON) * 100) / 100,
          itemStyle: {
            color: neonColors[index % neonColors.length][0],
            shadowBlur: 6,
            shadowColor: neonColors[index % neonColors.length][0],
          },
        })),
        label: {
          formatter: "{b}: {c} $",
          color: "#c2f8ff",
          textShadowColor: "#00eaff",
          textShadowBlur: 2,
        },
        emphasis: {
          scale: true,
          scaleSize: 3,
          itemStyle: {
            shadowBlur: 15,
            shadowColor: "#00eaff",
          },
          label: {
            color: "#00eaff",
            fontWeight: "bold",
          },
        },
      },
    ],
  };

  // --- 2. По сервисам (bar) ---
  const activeSubs = sourceSubs.filter((s) => s.status === "active");

  const serviceOption = {
    title: { text: t("TopSubsByPrice"), left: "center", textStyle: {color: "rgba(218, 218, 218, 0.87)"} },
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
    data: activeSubs.map((s) => Math.round((s.price + Number.EPSILON) * 100) / 100),
    type: "bar",
    itemStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "#00eaff" },
        { offset: 1, color: "#0078ff" },
      ]),
      shadowBlur: 7,
      shadowColor: "#00eaff",
    },
  },
],

  };

  // --- 3. По месяцам (line) ---
  const monthlyTotals = {};
  sourceSubs.forEach((sub) => {
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
    title: { text: t("PaymentsByMonth"), left: "center", textStyle: {color: "rgba(218, 218, 218, 0.87)"}},
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
    data: Object.values(monthlyTotals),
    type: "line",
    smooth: true,
    lineStyle: {
      color: "#00eaff",
      width: 3,
      shadowBlur: 10,
      shadowColor: "#00eaff",
    },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "rgba(0, 234, 255, 0.4)" },
        { offset: 1, color: "rgba(0, 234, 255, 0)" },
      ]),
    },
    symbol: "circle",
    symbolSize: 6,
    itemStyle: { color: "#00eaff" },
  },
],

  };

  //Стили для таблиц
  echarts.registerTheme("futurism", {
  backgroundColor: "transparent",
  textStyle: { color: "rgba(218, 218, 218, 0.87)" },
  title: {
    textStyle: {
      color: "#c2f8ff",
      textShadowColor: "#00eaff",
      textShadowBlur: 8,
      fontWeight: "600",
      fontSize: 16,
    },
  },
  tooltip: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderColor: "#00eaff",
    textStyle: { color: "#c2f8ff" },
    shadowBlur: 10,
    shadowColor: "#00eaff",
  },
  grid: { containLabel: true },
  axisPointer: { lineStyle: { color: "#00eaff" } },
  axisLine: { lineStyle: { color: "#00eaff" } },
  axisLabel: { color: "#c2f8ff" },
  splitLine: { lineStyle: { color: "rgba(0, 234, 255, 0.15)" } },
});


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
    <main className="flex h-full w-full">
      <div className="flex flex-col items-start w-full pr-4 pl-4 bg-gray-800">
        {showDemoNotice && (
          <div className="flex items-center w-auto m-auto mt-5 justify-center gap-2 text-sky-500 p-3 mb-4 border-2 rounded-lg">
            <Info className="w-5 h-5" />
            <span>{t("DemoNotice")}</span>
          </div>
        )}

        <div className="flex flex-col w-full mb-4 border-b-2 pb-3">
          <div className="flex flex-col w-full mb-4">
            <h2 className="font-jura font-light">{t("SumSubs")}</h2>
            <span className="text-[40px]">{subSum.toFixed(2)} $</span>
          </div>
          <p className="text-[20px]">
            {t("CountSubs")} : {totalSubs}
          </p>
          <h2>
            {t("ActiveSubs")} : {activeSubsCount}
          </h2>
        </div>
        <div className="flex w-full mb-4 mt-5">
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
                    <td className="border-b-1 whitespace-nowrap">
                      {formatPrice(sub, settings)}
                    </td>
                    <td className="border-b-1">{t(sub.category)}</td>
                    <td className="border-b-1">
                      {formatDate(sub.nextPayment, settings)}
                    </td>
                    <td
                      className={`border-b-1 !border-gray-300 ${
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
            // className="max-h-[400px] mb-5 border-b-1"
          theme="futurism"/>
          <ReactECharts
            option={serviceOption}
            // className="max-h-[400px] border-b-1"
          theme="futurism"/>
          <div className="col-span-2">
            <ReactECharts
              option={monthlyOption}
              // className="max-h-[400px] mt-5"
            theme="futurism"/>
          </div>
        </div>
      </div>
    </main>
  );
}
