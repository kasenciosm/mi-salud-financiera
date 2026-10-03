import { chartMonths, currentMonthInLima } from './monthlyReports.js';

export const chartMetrics = {
  net_worth: { label: 'Patrimonio', fields: ['net_worth'], colors: ['blue'] },
  flow: { label: 'Ingresos / gastos', fields: ['income', 'expenses'], colors: ['mint', 'rose'] },
  debt: { label: 'Deuda', fields: ['debt'], colors: ['lavender'] },
  cash_flow: { label: 'Saldo mensual', fields: ['cash_flow'], colors: ['mint'] },
  investments: { label: 'Inversiones', fields: ['investments'], colors: ['blue'] },
};
export const fieldLabels = { net_worth: 'Patrimonio', income: 'Ingresos', expenses: 'Gastos', debt: 'Deuda', cash_flow: 'Saldo mensual', investments: 'Inversiones' };
export function evolutionSlots(reports, range, current = currentMonthInLima()) {
  const date = new Date(`${current}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  const slots = chartMonths(reports, date.toISOString().slice(0, 7), range);
  const first = slots.findIndex(s => s.report);
  return first < 0 ? [] : slots.slice(first);
}
export function chartValue(report, field) {
  if (!report || report[field] == null || (['debt', 'net_worth'].includes(field) && report.debt_history_available === false)) return null;
  const value = Number(report[field]);
  return Number.isFinite(value) ? value : null;
}
export function chartDomain(slots, fields) {
  const values = slots.flatMap(s => fields.map(f => chartValue(s.report, f))).filter(v => v !== null);
  if (!values.length) return [0, 1];
  const lo = Math.min(...values), hi = Math.max(...values);
  const padding = Math.max((hi - lo) * .2, Math.abs(hi) * .05, 1);
  return [lo >= 0 ? Math.max(0, lo - padding) : lo - padding, hi + padding];
}
