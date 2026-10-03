import { money, expenseCategories } from '../finance.js';
import { buildCurrentReport, currentMonthInLima, monthLabel } from '../monthlyReports.js';
import { categoryIdentity } from '../catalog.js';
import Identity, { Icon } from './Identity.jsx';
import EvolutionChart from './EvolutionChart.jsx';
import { TransactionList } from './Transactions.jsx';

export function Stat({ label, value, meta, hero = false }) {
  return <article className={`surface stat ${hero ? 'stat-hero' : ''}`}><p>{label}</p><strong>{value == null ? 'Sin datos' : money(value)}</strong><small>{meta}</small></article>;
}
export default function Overview({ data, selectedMonth, history, onSelectMonth, onCategory, onTransactions, onEdit }) {
  const current = currentMonthInLima();
  const report = selectedMonth === current ? buildCurrentReport(data, current) : history.reports.find(r => r.month.slice(0,7) === selectedMonth);
  const categories = expenseCategories(data.transactions, selectedMonth);
  const total = categories.reduce((sum,[,value])=>sum+value,0);
  let position = 0;
  const gradient = categories.map(([name, value]) => {const start = position; position += value/total*100;return `var(--${categoryIdentity(name).color}) ${start}% ${position}%`;}).join(',');
  const recent = data.transactions.filter(r=>r.date.startsWith(selectedMonth)).slice(0,5);
  const prior = new Date(`${selectedMonth}-01T00:00:00Z`); prior.setUTCMonth(prior.getUTCMonth()-1);
  const priorReport = history.reports.find(r=>r.month.slice(0,7)===prior.toISOString().slice(0,7));
  const delta = report?.net_worth != null && priorReport?.net_worth != null ? Number(report.net_worth)-Number(priorReport.net_worth) : null;
  return <div className="view-stack"><div className="page-intro"><h1>Tu dinero, en perspectiva.</h1><p>Un vistazo a lo que entra, sale y crece.</p></div>
    {history.error && selectedMonth !== current && <div className="notice" role="alert">{history.error}<button className="text-action" onClick={history.retry}>Volver a intentar</button></div>}
    <div className="overview-stats"><Stat hero label="Patrimonio estimado" value={report?.net_worth} meta={delta == null ? 'Balance + inversiones − deudas' : `${delta >= 0 ? '+' : '−'}${money(Math.abs(delta))} frente al mes anterior`} /><Stat label="Ingresos del mes" value={report?.income} meta={`${monthLabel(selectedMonth)} · ${report?.closed_at ? 'cerrado' : selectedMonth===current ? 'en curso' : 'sin cierre'}`} /><Stat label="Gastos del mes" value={report?.expenses} meta={`Saldo del mes: ${report ? money(report.cash_flow) : 'Sin datos'}`} /></div>
    <EvolutionChart {...history} onSelectMonth={onSelectMonth} />
    <div className="overview-bottom"><section className="surface"><div className="section-heading"><h2>¿En qué se fue?</h2><span className="muted capitalize">{monthLabel(selectedMonth)}</span></div>
      {categories.length ? <><div className="donut-row"><div className="expense-donut" role="img" aria-label={`Distribución de gastos: ${categories.map(([name,value])=>`${name} ${money(value)}`).join(', ')}`} style={{background:`conic-gradient(${gradient})`}}><div><small>Total gastado</small><strong>{money(total)}</strong></div></div><p><strong>{data.transactions.filter(r=>r.type==='expense'&&r.date.startsWith(selectedMonth)).length} movimientos</strong><span>Consulta el detalle<br/>de cada categoría.</span></p></div><div>{categories.map(([name,value])=><button key={name} className="category-row" onClick={()=>onCategory(name)}><Identity name={name} categoryOnly/><span>{name}</span><strong>{money(value)}</strong><small>{(value/total*100).toFixed(0)}%</small><Icon name="right" size={14}/></button>)}</div></> : <p className="empty-state">Aún no registraste gastos en este mes.</p>}
      {report?.closed_at && <p className="fine-print">Distribución según movimientos registrados. El cierre mensual conserva sus cifras originales.</p>}
    </section><section className="surface"><div className="section-heading"><h2>Últimos movimientos</h2><button className="text-action" onClick={onTransactions}>Ver todos</button></div><TransactionList rows={recent} onEdit={onEdit} condensed /></section></div>
    <div className="summary-foot"><span><Icon name={report?.closed_at?'lock':'evolution'} size={14}/>{report?.closed_at?'Mes cerrado · Cifras conservadas':selectedMonth===current?'Mes en curso · Cierre automático al finalizar el mes':'Cierre no disponible'}</span><span>Hora de Perú</span></div>
  </div>;
}
