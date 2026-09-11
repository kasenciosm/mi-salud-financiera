import { useEffect, useState } from 'react';
import { money, shortDate } from '../finance.js';
import { financeService } from '../financeService.js';
import { buildCurrentReport, chartMonths, currentMonthInLima, monthLabel } from '../monthlyReports.js';

const metrics = {
  cash_flow: { label: 'Saldo mensual', color: '#34745e' },
  income: { label: 'Ingresos', color: '#34745e' },
  expenses: { label: 'Gastos', color: '#b6604b' },
  debt: { label: 'Deuda pendiente', color: '#b6604b' },
  investments: { label: 'Inversiones', color: '#a47b3f' },
  net_worth: { label: 'Patrimonio estimado', color: '#234e42' },
};
const amount = value => value == null ? 'No disponible' : money(value);

export default function MonthlyReports({ userId, data, selectedMonth, onSelectMonth }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('cash_flow');
  const [range, setRange] = useState(12);
  const [revision, setRevision] = useState(0);
  const current = currentMonthInLima();

  useEffect(() => {
    const reload = () => { if (!document.hidden) setRevision(r => r + 1); };
    const timer = window.setInterval(reload, 60000);
    window.addEventListener('focus', reload);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', reload); };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    financeService.listMonthlyReports(userId).then(rows => {
      if (active) setReports(rows);
    }).catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, revision, current]);

  const report = selectedMonth === current ? buildCurrentReport(data, current)
    : reports.find(r => r.month.slice(0, 7) === selectedMonth);
  const previousDate = new Date(`${current}-01T00:00:00Z`);
  previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);
  const slots = chartMonths(reports, previousDate.toISOString().slice(0, 7), range);
  const closed = Boolean(report?.closed_at);

  return <div className="grid min-w-0 gap-6">
    <section className="rounded-3xl bg-forest p-5 text-white sm:p-7">
      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#aac8b9]">Tu evolución financiera</p>
      <h2 className="mt-2 font-display text-3xl">Cada mes cuenta.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c5d8ce]">Al terminar el mes, tu reporte se guarda automáticamente con la hora de Perú. Puedes consultar los cierres y comparar tu evolución aquí.</p>
    </section>
    {error ? <section role="alert" className="rounded-2xl border border-line bg-white p-5"><p>{error}</p><button className="mt-3 text-sm font-bold text-green" onClick={() => setRevision(r => r + 1)}>Volver a intentar</button></section>
      : loading ? <p role="status" className="p-5 text-sm text-muted">Cargando tus reportes…</p>
      : <>
        <section className="min-w-0 rounded-3xl border border-line bg-white p-4 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-green">Reporte mensual</p><h3 className="mt-2 font-display text-2xl capitalize">{monthLabel(selectedMonth)}</h3></div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${closed ? 'bg-[#e5f0e9] text-green' : 'bg-[#f6efe3] text-[#87653f]'}`}>{closed ? 'Cerrado' : selectedMonth === current ? 'En curso' : selectedMonth > current ? 'Mes futuro' : 'Cierre pendiente'}</span>
          </div>
          {report ? <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[['Ingresos', report.income], ['Gastos', report.expenses], ['Saldo del mes', report.cash_flow], ['Balance acumulado', report.accumulated_balance], ['Deuda pendiente', report.debt], ['Inversiones', report.investments], ['Patrimonio estimado', report.net_worth]].map(([label, value]) => <div className="min-w-0 rounded-2xl bg-[#f2f5f3] p-4" key={label}><p className="text-xs text-muted">{label}</p><strong className={`mt-2 block break-words font-display text-2xl ${value < 0 ? 'text-danger' : 'text-forest'}`}>{amount(value)}</strong></div>)}
              <div className="rounded-2xl bg-[#f2f5f3] p-4"><p className="text-xs text-muted">Saldo / ingresos</p><strong className="mt-2 block font-display text-2xl">{report.savings_rate == null ? 'Sin ingresos' : `${Number(report.savings_rate).toFixed(1)}%`}</strong></div>
            </div>
            <div className="mt-5 space-y-2 text-xs leading-5 text-muted">
              <p>{closed ? 'Este cierre conserva sus cifras. Los ajustes posteriores se registran en el mes actual.' : 'Vista provisional del mes. Se actualizará con tus registros hasta el cierre.'}</p>
              {!report.debt_history_available && <p>Este mes es anterior al historial de deudas. Su deuda, patrimonio e indicador no se pueden reconstruir con certeza.</p>}
              <p>{report.statement_date ? `Inversiones: último estado disponible al ${shortDate(report.statement_date)}.` : 'No hay un estado de inversiones disponible para este mes.'} Deudas e inversiones en USD se estiman a S/3,75. Los movimientos usan su tipo de cambio registrado.</p>
              <p>Balance acumulado: ingresos menos gastos registrados hasta este mes. El patrimonio es una estimación según los registros de la app.</p>
            </div>
          </> : <p className="mt-6 text-sm leading-6 text-muted">{selectedMonth > current ? 'El reporte estará disponible cuando comience este mes.' : 'Todavía no hay un cierre disponible para este mes. El sistema recupera los cierres pendientes automáticamente.'}</p>}
        </section>
        <section className="min-w-0 rounded-3xl border border-line bg-white p-4 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-widest text-green">Meses cerrados</p><h3 className="mt-2 font-display text-2xl">Tu comportamiento mensual</h3></div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Indicador del gráfico" className="max-w-full rounded-xl border border-line p-2 text-sm" value={metric} onChange={e => setMetric(e.target.value)}>{Object.entries(metrics).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}</select>
              <select aria-label="Periodo del gráfico" className="rounded-xl border border-line p-2 text-sm" value={range} onChange={e => setRange(Number(e.target.value))}><option value={6}>6 meses</option><option value={12}>12 meses</option></select>
            </div>
          </div>
          <MonthlyChart slots={slots} metric={metric} />
          <p className="mt-2 text-xs text-muted">Solo se comparan cierres guardados. Selecciona un mes en el historial para ver su reporte.</p>
          <p className="mt-2 text-xs text-muted sm:hidden">Desliza el gráfico hacia los lados para ver todos los meses.</p>
        </section>
        <section className="min-w-0 rounded-3xl border border-line bg-white p-4 sm:p-7">
          <h3 className="font-display text-2xl">Historial de cierres</h3>
          {reports.length ? <div className="mt-5 max-w-full overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><caption className="sr-only">Ingresos, gastos y saldo de cada mes cerrado</caption><thead><tr className="border-b border-line text-xs text-muted"><th className="py-3">Mes</th><th className="text-right">Ingresos</th><th className="text-right">Gastos</th><th className="text-right">Saldo</th><th className="text-right">Reporte</th></tr></thead><tbody>{reports.map(r => <tr className="border-b border-line/60" key={r.month}><th className="py-4 pr-3 font-medium capitalize">{monthLabel(r.month)}</th><td className="text-right">{amount(r.income)}</td><td className="text-right">{amount(r.expenses)}</td><td className={`text-right font-bold ${r.cash_flow < 0 ? 'text-danger' : 'text-green'}`}>{amount(r.cash_flow)}</td><td className="text-right"><button className="rounded-lg px-3 py-2 font-bold text-green hover:bg-[#edf4f1]" aria-label={`Ver reporte de ${monthLabel(r.month)}`} onClick={() => onSelectMonth(r.month.slice(0, 7))}>Ver</button></td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-muted">Tu primer cierre aparecerá aquí al terminar el mes.</p>}
        </section>
      </>}
  </div>;
}

export function MonthlyChart({ slots, metric }) {
  const { label, color } = metrics[metric];
  const values = slots.map(s => s.report?.[metric]).filter(v => v != null).map(Number);
  if (!values.length) return <p className="my-10 text-center text-sm text-muted">Aún no hay cierres con datos de {label.toLowerCase()}.</p>;
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  const span = max - min || 1;
  const y = v => 205 - (v - min) / span * 170;
  const zero = y(0), step = 650 / slots.length;
  return <div className="mt-6 overflow-x-auto"><svg viewBox="0 0 760 255" className="w-full min-w-[540px]" role="img" aria-label={`${label} de los últimos ${slots.length} meses cerrados, en soles`}>
    {[min, max].filter((v, i, all) => all.indexOf(v) === i).map(v => <g key={v}><line x1="95" x2="745" y1={y(v)} y2={y(v)} stroke="#e0e8e2" /><text x="88" y={y(v) + 4} textAnchor="end" fill="#677a70" fontSize="11">{money(v)}</text></g>)}
    <line x1="95" x2="745" y1={zero} y2={zero} stroke="#b1c3b8" />
    {slots.map(({ month, report }, index) => {
      const value = report?.[metric], x = 95 + index * step + step / 2;
      return <g key={month}><title>{monthLabel(month)}: {value == null ? 'No disponible' : money(value)}</title>
        {value != null ? Number(value) === 0 ? <circle cx={x} cy={zero} r="3" fill={color} /> : <rect x={x - step * .28} y={Math.min(zero, y(value))} width={step * .56} height={Math.max(2, Math.abs(y(value) - zero))} rx="3" fill={Number(value) < 0 ? '#b6604b' : color} /> : <text x={x} y={zero - 8} textAnchor="middle" fontSize="12" fill="#9ba79f">—</text>}
        <text x={x} y="230" textAnchor="middle" fill="#677a70" fontSize="10">{new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))}</text><text x={x} y="246" textAnchor="middle" fill="#8d9a92" fontSize="9">{month.slice(0, 4)}</text>
      </g>;
    })}
  </svg></div>;
}
