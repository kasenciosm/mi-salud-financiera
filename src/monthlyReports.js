import { calculateSummary } from './finance.js';

export function currentMonthInLima(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
}

export function monthLabel(month) {
  return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month.slice(0, 7)}-01T00:00:00Z`));
}

export function buildCurrentReport(data, month = currentMonthInLima()) {
  const scoped = {
    ...data,
    transactions: data.transactions.filter(t => t.date.slice(0, 7) <= month),
    statements: data.statements.filter(s => s.statementDate.slice(0, 7) <= month),
  };
  const s = calculateSummary(scoped, month);
  return {
    month: `${month}-01`, closed_at: null,
    income: s.income, expenses: s.expenses, cash_flow: s.cashFlow,
    accumulated_balance: s.accumulatedBalance,
    savings_rate: s.income > 0 ? s.cashFlow / s.income * 100 : null,
    debt: s.debt, monthly_debt_payment: s.monthlyDebtPayment,
    investments: s.investments, statement_date: s.latestStatement?.statementDate || null,
    net_worth: s.netWorth, score: s.score, debt_history_available: true, exchange_rate: 3.75,
  };
}

// Mantiene los huecos como null; un cierre pendiente nunca aparece como cero.
export function chartMonths(reports, endMonth, count = 12) {
  const rows = new Map(reports.filter(r => r.closed_at).map(r => [r.month.slice(0, 7), r]));
  const [year, month] = endMonth.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    const key = date.toISOString().slice(0, 7);
    return { month: key, report: rows.get(key) || null };
  });
}
