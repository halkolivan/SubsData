// src/utils/formatUtils.js
export function formatDate(dateStr, settings) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  switch (settings?.dateFormat) {
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

export function formatPrice(sub, settings) {
  if (!sub) return "";
  const to = settings?.currency?.defaultCurrency || "USD";
  const rates = settings?.currency?.rates || { USD: 1 };
  const rateFrom = rates[sub.currency] ?? 1;
  const rateTo = rates[to] ?? 1;
  const converted = ((sub.price / rateFrom) * rateTo).toFixed(2);

  if (settings?.currency?.showOriginalCurrency && sub.currency !== to) {
    return `${converted} ${to} (${sub.price} ${sub.currency})`;
  }
  return `${converted} ${to}`;
}
