import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCurrentReport, currentMonthInLima, chartMonths } from '../src/monthlyReports.js';

test('el mes cambia a medianoche de Lima, no a medianoche UTC', () => {
  assert.equal(currentMonthInLima(new Date('2027-01-01T04:59:59Z')), '2026-12');
  assert.equal(currentMonthInLima(new Date('2027-01-01T05:00:00Z')), '2027-01');
});
test('la vista en curso excluye meses futuros y conserva el saldo previo', () => {
  const data = { debts: [], statements: [
    { statementDate: '2026-10-01', marketValue: 9999, cashBalance: 0, currency: 'PEN' },
    { statementDate: '2026-08-01', marketValue: 100, cashBalance: 0, currency: 'PEN' },
  ], transactions: [
    { date: '2026-08-10', type: 'income', amount: 400, currency: 'PEN' },
    { date: '2026-09-10', type: 'income', amount: 100, currency: 'USD', exchangeRate: 3.8 },
    { date: '2026-09-11', type: 'expense', amount: 500, currency: 'PEN' },
    { date: '2026-10-10', type: 'income', amount: 9999, currency: 'PEN' },
  ] };
  const report = buildCurrentReport(data, '2026-09');
  assert.equal(report.income, 380);
  assert.equal(report.cash_flow, -120);
  assert.equal(report.accumulated_balance, 280);
  assert.equal(report.investments, 100);
  assert.ok(report.savings_rate < 0);
  assert.equal(report.closed_at, null);
});
test('sin ingresos no se inventa un porcentaje', () => {
  const report = buildCurrentReport({ transactions: [], debts: [], statements: [] }, '2026-09');
  assert.equal(report.savings_rate, null);
});
test('el gráfico ordena por calendario y distingue huecos, ceros y meses abiertos', () => {
  const rows = [
    { month: '2027-01-01', closed_at: '2027-02-01', cash_flow: 0 },
    { month: '2026-11-01', closed_at: '2026-12-01', cash_flow: -10 },
    { month: '2026-12-01', closed_at: null, cash_flow: 100 },
  ];
  const result = chartMonths(rows, '2027-01', 3);
  assert.deepEqual(result.map(r => r.month), ['2026-11', '2026-12', '2027-01']);
  assert.equal(result[0].report.cash_flow, -10);
  assert.equal(result[1].report, null);
  assert.equal(result[2].report.cash_flow, 0);
});
