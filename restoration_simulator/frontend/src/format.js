export const money = (value) =>
  value === null || value === undefined
    ? "Unknown"
    : new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }).format(value);
export const year = (value) =>
  value === null || value === undefined
    ? "Unknown"
    : Number(value).toLocaleString("en", { maximumFractionDigits: 4 });
