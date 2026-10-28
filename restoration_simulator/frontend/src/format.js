const number = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      "Missing or invalid numeric data from Python. Reload the saved project.",
    );
  }
  return value;
};
export const money = (value) =>
  value === null
    ? "Unknown"
    : new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }).format(number(value));
export const year = (value) =>
  value === null
    ? "Unknown"
    : number(value).toLocaleString("en", { maximumFractionDigits: 4 });
export const area = (value) =>
  value === null
    ? "Unknown"
    : `${number(value).toLocaleString("en", { maximumFractionDigits: 6 })} m²`;
