import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSummary,
  calculateInstallment,
  normalizeDebt,
  normalizePayment,
  normalizeStatement,
  normalizeTransaction,
} from "../src/finance.js";
import { categoryIdentity } from "../src/catalog.js";

const data = (transactions = [], debts = [], statements = []) => ({
  transactions,
  debts,
  debtPayments: [],
  statements,
});

test("calcula ingresos, egresos y balance acumulado", () => {
  const rows = [
    { date: "2026-08-01", type: "income", amount: 5000, currency: "PEN", exchangeRate: 1 },
    { date: "2026-08-02", type: "expense", amount: 1200, currency: "PEN", exchangeRate: 1 },
  ];
  const result = calculateSummary(data(rows), "2026-08");
  assert.equal(result.income, 5000);
  assert.equal(result.expenses, 1200);
  assert.equal(result.cashFlow, 3800);
  assert.equal(result.accumulatedBalance, 3800);
});

test("convierte dólares usando el tipo de cambio", () => {
  const rows = [{ date: "2026-08-01", type: "income", amount: 100, currency: "USD", exchangeRate: 3.8 }];
  assert.equal(calculateSummary(data(rows), "2026-08").income, 380);
});

test("calcula deuda, inversión y patrimonio", () => {
  const result = calculateSummary(data(
    [{ date: "2026-08-01", type: "income", amount: 5000, currency: "PEN", exchangeRate: 1 }],
    [{ status: "active", outstandingAmount: 2000, monthlyPayment: 400, currency: "PEN" }],
    [{ contributedCapital: 1000, marketValue: 1150, cashBalance: 50, dividends: 20, currency: "PEN" }],
  ), "2026-08");
  assert.equal(result.debt, 2000);
  assert.equal(result.investments, 1200);
  assert.equal(result.investmentResult, 220);
  assert.equal(result.netWorth, 4200);
});

test("la deuda de tarjeta no resta capital hasta que se paga", () => {
  const income = { date: "2026-08-01", type: "income", amount: 5000, currency: "PEN", exchangeRate: 1 };
  const card = { status: "active", debtType: "credit_card", outstandingAmount: 2000, monthlyPayment: 400, currency: "PEN" };
  const beforePayment = calculateSummary(data([income], [card]), "2026-08");
  assert.equal(beforePayment.debt, 2000);
  assert.equal(beforePayment.netWorth, 5000);

  const payment = { date: "2026-08-20", type: "expense", amount: 400, currency: "PEN", exchangeRate: 1 };
  const afterPayment = calculateSummary(data([income, payment], [{ ...card, outstandingAmount: 1600 }]), "2026-08");
  assert.equal(afterPayment.debt, 1600);
  assert.equal(afterPayment.netWorth, 4600);
});

test("asigna iconos específicos a libros, medicamentos y clínicas", () => {
  assert.equal(categoryIdentity("Libros").icon, "book-open");
  assert.equal(categoryIdentity("Medicina").icon, "pill");
  assert.equal(categoryIdentity("Clínica").icon, "hospital");
});

test("normaliza los datos editables de un movimiento", () => {
  const row = normalizeTransaction({ date: "2026-08-10", type: "expense", category: "  Comida ", description: "  Mercado ", amount: "40.50", currency: "PEN", exchangeRate: "1" });
  assert.deepEqual(row, { date: "2026-08-10", type: "expense", category: "Comida", description: "Mercado", merchant: "", paymentMethod: "", amount: 40.5, currency: "PEN", exchangeRate: 1 });
});

test("normaliza deudas y las marca pagadas con saldo cero", () => {
  const row = normalizeDebt({ creditor: "Banco", originalAmount: "1000", outstandingAmount: "0", monthlyPayment: "200", annualRate: "12", dueDay: "15", currency: "PEN" });
  assert.equal(row.status, "paid");
  assert.equal(row.dueDay, 15);
});

test("estima cuotas de tarjeta con tasa anual, permite Diners y conserva el progreso", () => {
  assert.equal(calculateInstallment(12000, 12, 12), 1066.19);
  assert.equal(calculateInstallment(12000, 0, 12), 1000);
  const debt = normalizeDebt({ creditor: "Diners Club", debtType: "credit_card", originalAmount: "12000", outstandingAmount: "11053.81", installmentCount: "12", installmentsPaid: "1", annualRate: "12", monthlyPayment: "1066.19", currency: "PEN" });
  assert.equal(debt.creditor, "Diners Club");
  assert.equal(debt.debtType, "credit_card");
  assert.equal(debt.installmentsPaid, 1);
  assert.equal(debt.status, "active");
  assert.throws(() => normalizeDebt({ creditor: "Diners Club", debtType: "credit_card", originalAmount: "12000", installmentCount: "0" }), /1 y 120 cuotas/);
});

test("normaliza estados de cuenta y pagos", () => {
  const statement = normalizeStatement({ statementDate: "2026-08-20", institution: "Grupo Coril", contributedCapital: "1000", marketValue: "1050", dividends: "15", cashBalance: "20", currency: "PEN" });
  const payment = normalizePayment({ paymentDate: "2026-08-22", amount: "250.50", notes: "Cuota" });
  assert.equal(statement.marketValue, 1050);
  assert.equal(payment.amount, 250.5);
});

test("rechaza montos inválidos", () => {
  assert.throws(() => normalizeTransaction({ date: "2026-08-10", category: "Comida", amount: "0" }), /mayor que cero/);
  assert.throws(() => normalizePayment({ paymentDate: "2026-08-10", amount: "0" }), /mayor que cero/);
});
