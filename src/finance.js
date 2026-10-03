export const START_MONTH = "2026-08";
export const DEFAULT_EXCHANGE_RATE = 3.75;

export const emptyFinanceData = {
  transactions: [],
  debts: [],
  debtPayments: [],
  statements: [],
};

const text = (value) => String(value ?? "").trim();
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const currency = (value) => value === "USD" ? "USD" : "PEN";

export function todayInLima() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function money(value, selectedCurrency = "PEN") {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: selectedCurrency,
    maximumFractionDigits: 2,
  }).format(number(value));
}

export function shortDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function inPen(value, selectedCurrency = "PEN", exchangeRate = DEFAULT_EXCHANGE_RATE) {
  return selectedCurrency === "USD"
    ? number(value) * number(exchangeRate, DEFAULT_EXCHANGE_RATE)
    : number(value);
}

export function calculateSummary(data, selectedMonth) {
  const monthRows = data.transactions.filter((item) => item.date.startsWith(selectedMonth));
  const income = monthRows
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + inPen(item.amount, item.currency, item.exchangeRate), 0);
  const expenses = monthRows
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + inPen(item.amount, item.currency, item.exchangeRate), 0);
  const accumulatedBalance = data.transactions.reduce(
    (sum, item) => sum + (item.type === "income" ? 1 : -1) * inPen(item.amount, item.currency, item.exchangeRate),
    0,
  );
  const debt = data.debts
    .filter((item) => item.status === "active")
    .reduce((sum, item) => sum + inPen(item.outstandingAmount, item.currency), 0);
  const monthlyDebtPayment = data.debts
    .filter((item) => item.status === "active")
    .reduce((sum, item) => sum + inPen(item.monthlyPayment, item.currency), 0);
  const latestStatement = data.statements[0] || null;
  const investments = latestStatement
    ? inPen(number(latestStatement.marketValue) + number(latestStatement.cashBalance), latestStatement.currency)
    : 0;
  const investedCapital = latestStatement
    ? inPen(latestStatement.contributedCapital, latestStatement.currency)
    : 0;
  const investmentResult = latestStatement
    ? inPen(number(latestStatement.marketValue) + number(latestStatement.cashBalance) + number(latestStatement.dividends) - number(latestStatement.contributedCapital), latestStatement.currency)
    : 0;
  const cashFlow = income - expenses;
  const availableRate = income > 0 ? Math.max(0, cashFlow / income * 100) : 0;
  const debtLoad = income > 0 ? monthlyDebtPayment / income * 100 : 0;
  const score = income > 0
    ? Math.round(Math.min(100, Math.max(0, 55 + availableRate * 0.4 - debtLoad * 0.35)))
    : 0;
  const netWorth = accumulatedBalance + investments - debt;

  return {
    income,
    expenses,
    accumulatedBalance,
    cashFlow,
    availableRate,
    debt,
    monthlyDebtPayment,
    investments,
    investedCapital,
    investmentResult,
    latestStatement,
    netWorth,
    score,
  };
}

export function expenseCategories(transactions, selectedMonth) {
  const totals = new Map();
  transactions
    .filter((item) => item.type === "expense" && item.date.startsWith(selectedMonth))
    .forEach((item) => {
      totals.set(item.category, (totals.get(item.category) || 0) + inPen(item.amount, item.currency, item.exchangeRate));
    });
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export function normalizeTransaction(form) {
  const amount = number(form.amount);
  if (!form.date) throw new Error("La fecha es obligatoria.");
  if (!text(form.category)) throw new Error("La categoría es obligatoria.");
  if (amount <= 0) throw new Error("El monto debe ser mayor que cero.");
  return {
    date: form.date,
    type: form.type === "expense" ? "expense" : "income",
    category: text(form.category),
    description: text(form.description),
    merchant: text(form.merchant),
    paymentMethod: text(form.paymentMethod),
    amount,
    currency: currency(form.currency),
    exchangeRate: Math.max(number(form.exchangeRate, 1), 0.0001),
  };
}

export function normalizeDebt(form) {
  const outstandingAmount = Math.max(number(form.outstandingAmount), 0);
  const originalAmount = Math.max(number(form.originalAmount), outstandingAmount);
  if (!text(form.creditor)) throw new Error("El acreedor es obligatorio.");
  if (originalAmount <= 0) throw new Error("El monto original debe ser mayor que cero.");
  const dueDay = number(form.dueDay);
  return {
    creditor: text(form.creditor),
    originalAmount,
    outstandingAmount,
    monthlyPayment: Math.max(number(form.monthlyPayment), 0),
    annualRate: Math.max(number(form.annualRate), 0),
    dueDay: dueDay >= 1 && dueDay <= 31 ? Math.round(dueDay) : null,
    currency: currency(form.currency),
    status: outstandingAmount <= 0 ? "paid" : "active",
  };
}

export function normalizeStatement(form) {
  if (!form.statementDate) throw new Error("La fecha del estado de cuenta es obligatoria.");
  return {
    statementDate: form.statementDate,
    institution: text(form.institution) || "Grupo Coril",
    contributedCapital: Math.max(number(form.contributedCapital), 0),
    marketValue: Math.max(number(form.marketValue), 0),
    dividends: Math.max(number(form.dividends), 0),
    cashBalance: Math.max(number(form.cashBalance), 0),
    currency: currency(form.currency),
    notes: text(form.notes),
  };
}

export function normalizePayment(form) {
  const amount = number(form.amount);
  if (!form.paymentDate) throw new Error("La fecha del pago es obligatoria.");
  if (amount <= 0) throw new Error("El pago debe ser mayor que cero.");
  return { paymentDate: form.paymentDate, amount, notes: text(form.notes) };
}
