import { useCallback, useEffect, useState } from "react";
import {
  START_MONTH,
  emptyFinanceData,
  money,
  normalizeDebt,
  normalizePayment,
  normalizeStatement,
  normalizeTransaction,
  shortDate,
} from "../finance.js";
import { authService, financeService } from "../financeService.js";
import { dismissLegacyImport, finishLegacyImport, loadLegacyTransactions } from "../storage.js";
import RecordModal from "./RecordModal.jsx";
import ReportsView from './ReportsView.jsx';
import Overview from './Overview.jsx';
import Transactions from './Transactions.jsx';
import Identity, { Icon } from './Identity.jsx';
import EvolutionChart from './EvolutionChart.jsx';
import useMonthlyReports from '../useMonthlyReports.js';
import { currentMonthInLima } from "../monthlyReports.js";

const navItems = [
  { id: 'summary', label: 'Resumen', icon: 'house' },
  { id: 'transactions', label: 'Movimientos', icon: 'movements' },
  { id: 'reports', label: 'Evolución', icon: 'evolution' },
  { id: 'debts', label: 'Deudas', icon: 'credit-card' },
  { id: 'investments', label: 'Inversiones', icon: 'investments' },
];

const actionByView = {
  summary: { label: "Nuevo movimiento", kind: "transaction" },
  transactions: { label: "Nuevo movimiento", kind: "transaction" },
  debts: { label: "Nueva deuda", kind: "debt" },
  investments: { label: "Nuevo estado", kind: "statement" },
  reports: { label: "Nuevo movimiento", kind: "transaction" },
};

export default function Dashboard({ user }) {
  const history = useMonthlyReports(user.id);
  const [category, setCategory] = useState('');
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('finance-theme') || 'dark'; } catch { return 'dark'; } });
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('finance-theme',theme); } catch {} },[theme]);
  const [view, setView] = useState("summary");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthInLima);
  const [data, setData] = useState(emptyFinanceData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState(null);
  const [legacyRows, setLegacyRows] = useState(() => loadLegacyTransactions());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await financeService.listAll(user.id));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // Al volver a la app, actualizar datos y detectar el cambio de mes.
  useEffect(() => {
    let lastMonth = currentMonthInLima();
    const checkMonth = () => {
      const next = currentMonthInLima();
      if (next !== lastMonth) {
        const previousMonth = lastMonth;
        setSelectedMonth(previous => previous === previousMonth ? next : previous);
        lastMonth = next;
        refresh();
      }
    };
    const timer = window.setInterval(checkMonth, 30000);
    window.addEventListener('focus', checkMonth);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', checkMonth); };
  }, [refresh]);

  const title = navItems.find((item) => item.id === view)?.label || "Resumen";
  const action = actionByView[view];
  const displayName = user.user_metadata?.full_name?.trim() || user.email?.split("@")[0] || "Usuario";

  function notify(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 4200);
  }

  async function saveRecord(form) {
    setBusy(true);
    try {
      if (modal.kind === "transaction") {
        const record = normalizeTransaction(form);
        if (modal.record?.id) await financeService.updateTransaction(modal.record.id, record);
        else await financeService.createTransaction(record);
      }
      if (modal.kind === "debt") {
        const record = normalizeDebt(form);
        if (modal.record?.id) await financeService.updateDebt(modal.record.id, record);
        else await financeService.createDebt(record);
      }
      if (modal.kind === "statement") {
        const record = normalizeStatement(form);
        if (modal.record?.id) await financeService.updateStatement(modal.record.id, record);
        else await financeService.createStatement(record);
      }
      if (modal.kind === "payment") {
        await financeService.registerDebtPayment(modal.debt.id, normalizePayment(form));
      }
      setModal(null);
      await refresh();
      notify(modal.record?.id ? "Los cambios se guardaron correctamente." : "El registro se guardó correctamente.");
    } catch (error) {
      setModal((current) => current ? { ...current, error: error.message } : current);
    } finally {
      setBusy(false);
    }
  }

  async function removeRecord(kind, record) {
    const copy = kind === "debt"
      ? "Se eliminará la deuda y su historial de pagos. Los egresos ya creados se conservarán."
      : "Esta acción no se puede deshacer.";
    if (!window.confirm(`¿Eliminar este registro?\n\n${copy}`)) return;
    setBusy(true);
    try {
      if (kind === "transaction") await financeService.deleteTransaction(record.id);
      if (kind === "debt") await financeService.deleteDebt(record.id);
      if (kind === "statement") await financeService.deleteStatement(record.id);
      await refresh();
      notify("Registro eliminado.");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function importLegacy() {
    setBusy(true);
    try {
      await financeService.importTransactions(legacyRows.map(normalizeTransaction));
      finishLegacyImport();
      setLegacyRows([]);
      await refresh();
      notify("Tus movimientos locales ya están en tu cuenta.");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  function omitLegacy() {
    dismissLegacyImport();
    setLegacyRows([]);
  }

  function navigate(next) { setView(next); setCategory(''); window.scrollTo({top:0}); }
  function openReport(month) { setSelectedMonth(month); setView('reports'); window.scrollTo({top:0}); }
  return <div className="app-shell">
    <aside className="app-sidebar"><Brand/><nav aria-label="Navegación principal">{navItems.map(item=><button key={item.id} className={view===item.id?'active':''} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}><Icon name={item.icon}/>{item.label}</button>)}</nav><div className="account-block"><div className="avatar">{displayName.slice(0,1).toUpperCase()}</div><div><strong>{displayName}</strong><small>{user.email}</small></div><button className="icon-button" aria-label="Cerrar sesión" onClick={()=>authService.signOut()}><Icon name="logout"/></button></div></aside>
    <main className="app-main"><header className={`app-header${view==='investments'?' app-header-investments':''}`}><span className="app-breadcrumb">Mi salud financiera <span>/ {title}</span></span><div className="header-actions"><button className="icon-button" aria-label={`Tema: ${theme==='system'?'automático':theme==='light'?'claro':'oscuro'}. Cambiar tema`} onClick={()=>setTheme(theme==='system'?'light':theme==='light'?'dark':'system')}><Icon name="theme"/></button><button className="icon-button mobile-signout" aria-label="Cerrar sesión" onClick={()=>authService.signOut()}><Icon name="logout"/></button><label className="month-picker"><span className="sr-only">Mes seleccionado</span><input type="month" min={START_MONTH} value={selectedMonth} onChange={event=>{if(/^\d{4}-\d{2}$/.test(event.target.value))setSelectedMonth(event.target.value)}}/></label><button className="primary-button" onClick={()=>setModal({kind:action.kind,record:null})}><Icon name="plus" size={17}/><span>{view==='summary'||view==='transactions'||view==='reports'?'Registrar':action.label}</span></button></div></header>
      <div className="app-content">{legacyRows.length>0&&<LegacyBanner count={legacyRows.length} busy={busy} onImport={importLegacy} onDismiss={omitLegacy}/>}{message&&<div className="notice" role="status">{message}</div>}
        {loading?<LoadingDashboard/>:<>
          {view==='summary'&&<Overview data={data} history={history} selectedMonth={selectedMonth} onSelectMonth={openReport} onCategory={name=>{setCategory(name);setView('transactions')}} onTransactions={()=>navigate('transactions')} onEdit={record=>setModal({kind:'transaction',record})}/>}
          {view==='transactions'&&<Transactions rows={data.transactions} selectedMonth={selectedMonth} category={category} onCategory={setCategory} onEdit={record=>setModal({kind:'transaction',record})} onDelete={record=>removeRecord('transaction',record)}/>}
          {view==='debts'&&<><div className="page-intro"><h1>Un paso más cerca.</h1><p>Tu deuda pendiente y el avance de cada pago.</p></div><DebtsView data={data} onEdit={record=>setModal({kind:'debt',record})} onPay={debt=>setModal({kind:'payment',debt})} onDelete={record=>removeRecord('debt',record)}/></>}
          {view==='investments'&&<><div className="page-intro"><h1>Lo que haces crecer.</h1><p>Tus inversiones y estados de cuenta, en perspectiva.</p></div><EvolutionChart {...history} initialMetric="investments" title="Evolución de tus inversiones" onSelectMonth={openReport}/><div className="mt-6"><InvestmentsView statements={data.statements} onEdit={record=>setModal({kind:'statement',record})} onDelete={record=>removeRecord('statement',record)} onCreate={()=>setModal({kind:'statement',record:null})}/></div></>}
          {view==='reports'&&<ReportsView data={data} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} history={history}/>}
        </>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Navegación móvil">{navItems.map(item=><button key={item.id} className={view===item.id?'active':''} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>
    {modal&&<RecordModal key={`${modal.kind}-${modal.record?.id||modal.debt?.id||'new'}`} modal={modal} busy={busy} onClose={()=>setModal(null)} onSave={saveRecord}/>}
  </div>;
}

function DebtsView({ data, onEdit, onPay, onDelete }) {
  const active = data.debts.filter((item) => item.status === "active");
  const paid = data.debts.filter((item) => item.status === "paid");

  return (
    <div className="grid min-w-0 gap-6">
      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        {data.debts.length ? [...active, ...paid].map((debt) => {
          const paidAmount = Math.max(0, debt.originalAmount - debt.outstandingAmount);
          const progress = debt.originalAmount ? Math.min(100, paidAmount / debt.originalAmount * 100) : 0;

          return (
            <article key={debt.id} className="min-w-0 rounded-3xl border border-line bg-white p-5 sm:p-6">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${debt.status === "paid" ? "bg-[var(--surface-subtle)] text-green" : "bg-[var(--surface-subtle)] text-muted"}`}>
                    {debt.status === "paid" ? "Pagada" : "Activa"}
                  </span>
                  <h2 className="mt-3 flex items-center gap-3 break-words font-display text-2xl"><Identity name={debt.creditor}/>{debt.creditor}</h2>
                </div>
                <strong className="break-words font-display text-2xl text-forest sm:max-w-[50%] sm:text-right">
                  {money(debt.outstandingAmount, debt.currency)}
                </strong>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                <div className="h-full rounded-full bg-green" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
                <span>{progress.toFixed(0)}% pagado</span>
                <span>Original: {money(debt.originalAmount, debt.currency)}</span>
              </div>

              <div className={debt.debtType === 'credit_card' ? "mt-5 grid grid-cols-1 gap-3 border-y border-line py-4 min-[380px]:grid-cols-2 sm:grid-cols-4" : "mt-5 grid grid-cols-1 gap-3 border-y border-line py-4 min-[380px]:grid-cols-3"}>
                {debt.debtType === 'credit_card' && <SmallStat label="Cuotas pagadas" value={`${debt.installmentsPaid} de ${debt.installmentCount}`} dark />}
                <SmallStat label={debt.debtType === 'credit_card' ? "Cuota estimada" : "Cuota"} value={money(debt.monthlyPayment, debt.currency)} dark />
                <SmallStat label="Tasa anual" value={`${debt.annualRate}%`} dark />
                <SmallStat label="Vence" value={debt.dueDay ? `Día ${debt.dueDay}` : "—"} dark />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {debt.status === "active" && (
                  <button className="rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white" onClick={() => onPay(debt)}>
                    Registrar pago
                  </button>
                )}
                <ActionButton onClick={() => onEdit(debt)}>Editar</ActionButton>
                <ActionButton danger onClick={() => onDelete(debt)}>Eliminar</ActionButton>
              </div>
            </article>
          );
        }) : (
          <div className="min-w-0 xl:col-span-2">
            <Empty text="Aún no tienes deudas registradas. Añade una para seguir su saldo y pagos." />
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-3xl border border-line bg-white p-4 sm:p-7">
        <SectionTitle eyebrow={`${data.debtPayments.length} pagos`} title="Historial de pagos" subtitle="Cada pago también aparece como egreso en tus movimientos." />
        <div className="mt-5 min-w-0">
          {data.debtPayments.length ? (
            <div className="grid min-w-0 gap-2">
              {data.debtPayments.map((payment) => {
                const debt = data.debts.find((item) => item.id === payment.debtId);

                return (
                  <div key={payment.id} className="flex min-w-0 flex-col items-start gap-2 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">{debt?.creditor || "Deuda eliminada"}</p>
                      <p className="mt-1 break-words text-[11px] text-muted">
                        {shortDate(payment.paymentDate)}{payment.notes ? ` · ${payment.notes}` : ""}
                      </p>
                      {debt?.debtType === 'credit_card' && (payment.principalPaid > 0 || payment.interestPaid > 0) && <p className="mt-1 text-[11px] text-muted">Capital: {money(payment.principalPaid, debt.currency)} · Interés: {money(payment.interestPaid, debt.currency)}</p>}
                    </div>
                    <strong className="shrink-0 text-sm text-danger">−{money(payment.amount, debt?.currency || "PEN")}</strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty compact text="Todavía no hay pagos registrados." />
          )}
        </div>
      </section>
    </div>
  );
}

function InvestmentsView({ statements, onEdit, onDelete, onCreate }) {
  const latest = statements[0];
  const result = latest ? latest.marketValue + latest.cashBalance + latest.dividends - latest.contributedCapital : 0;
  const returnRate = latest?.contributedCapital ? result / latest.contributedCapital * 100 : 0;

  return (
    <div className="grid min-w-0 gap-6">
      {latest ? (
        <section className="grid min-w-0 gap-3 sm:grid-cols-3">
          <Metric label="Valor actual" value={money(latest.marketValue + latest.cashBalance, latest.currency)} meta={`Estado al ${shortDate(latest.statementDate)}`} tone="dark" />
          <Metric label="Capital aportado" value={money(latest.contributedCapital, latest.currency)} meta={latest.institution} />
          <Metric label="Resultado acumulado" value={`${result >= 0 ? "+" : ""}${money(result, latest.currency)}`} meta={`${returnRate.toFixed(2)}% sobre aportes`} tone={result < 0 ? "danger" : "green"} />
        </section>
      ) : null}

      <section className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-line bg-white p-4 sm:p-7">
        <SectionTitle eyebrow={`${statements.length} estados`} title="Estados de cuenta" subtitle="Registra cada nuevo estado de Grupo Coril sin borrar el anterior; así conservas el historial." />
        <div className="mt-6 min-w-0 max-w-full">
          {statements.length ? (
            <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold tracking-[.1em] text-muted uppercase">
                    <th className="pb-3">Fecha</th>
                    <th className="pb-3">Institución</th>
                    <th className="pb-3 text-right">Aportes</th>
                    <th className="pb-3 text-right">Valor</th>
                    <th className="pb-3 text-right">Dividendos</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map((row) => (
                    <tr key={row.id} className="border-b border-line/70 last:border-0">
                      <td className="py-4 text-xs text-muted">{shortDate(row.statementDate)}</td>
                      <td className="py-4 text-sm font-semibold">{row.institution}</td>
                      <td className="py-4 text-right text-sm">{money(row.contributedCapital, row.currency)}</td>
                      <td className="py-4 text-right text-sm font-bold text-forest">{money(row.marketValue + row.cashBalance, row.currency)}</td>
                      <td className="py-4 text-right text-sm">{money(row.dividends, row.currency)}</td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <ActionButton onClick={() => onEdit(row)}>Editar</ActionButton>
                          <ActionButton danger onClick={() => onDelete(row)}>Eliminar</ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="Aún no hay estados de cuenta." action="Registrar el primero" onAction={onCreate} />
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, meta, tone }) {
  const tones = {
    dark: "stat-hero text-ink border-line",
    danger: "bg-white text-danger border-line",
    green: "bg-white text-green border-line",
  };

  return (
    <article
      className={`min-w-0 rounded-3xl border p-5 ${
        tones[tone] || "border-line bg-white text-ink"
      }`}
    >
      <p
        className={`text-[11px] font-bold tracking-[.12em] uppercase ${
          "text-muted"
        }`}
      >
        {label}
      </p>

      <strong className="mt-5 block break-words font-display text-[clamp(1.8rem,8vw,2.4rem)] font-medium leading-none tracking-[-.03em]">
        {value}
      </strong>

      <p
        className={`mt-3 break-words text-[11px] ${
          "text-muted"
        }`}
      >
        {meta}
      </p>
    </article>
  );
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return <div className="min-w-0"><p className="break-words text-[11px] font-bold tracking-[.15em] text-green uppercase">{eyebrow}</p><h2 className="mt-1 break-words font-display text-2xl tracking-[-.02em]">{title}</h2>{subtitle && <p className="mt-2 max-w-2xl break-words text-xs leading-5 text-muted">{subtitle}</p>}</div>;
}

function SmallStat({ label, value, dark = false }) {
  return <div className="min-w-0"><p className={`break-words text-[11px] font-bold tracking-[.08em] uppercase ${dark ? "text-muted" : "text-muted"}`}>{label}</p><p className={`mt-1 break-words text-xs font-bold ${dark ? "text-forest" : "text-white"}`}>{value}</p></div>;
}

function Empty({ text, compact = false, action, onAction }) {
  return <div className={`min-w-0 rounded-2xl border border-dashed border-line bg-[var(--surface-subtle)] text-center ${compact ? "p-5 sm:p-6" : "p-6 sm:p-10"}`}><p className="break-words text-sm leading-6 text-muted">{text}</p>{action && <button className="mt-4 max-w-full rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white" onClick={onAction}>{action}</button>}</div>;
}

function ActionButton({ children, danger = false, onClick, label }) {
  return <button type="button" aria-label={label} className={`rounded-lg px-2.5 py-2 text-[11px] font-bold transition ${danger ? "text-danger hover:bg-[var(--surface-subtle)]" : "text-green hover:bg-[var(--surface-subtle)]"}`} onClick={onClick}>{children}</button>;
}

function Brand() { return <div className="app-brand"><span><Icon name="wallet" size={23}/></span><strong>Mis finanzas</strong></div>; }

function LegacyBanner({ count, busy, onImport, onDismiss }) {
  return <section className="mb-5 flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-[var(--surface-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words text-sm font-bold text-forest">Encontramos {count} movimientos de la versión local.</p><p className="mt-1 break-words text-xs leading-5 text-muted">Impórtalos una sola vez a esta cuenta o descarta el aviso.</p></div><div className="grid shrink-0 grid-cols-2 gap-2"><button className="rounded-xl px-3 py-2 text-xs font-bold text-muted" onClick={onDismiss} disabled={busy}>Omitir</button><button className="rounded-xl bg-forest px-3 py-2 text-xs font-bold text-white" onClick={onImport} disabled={busy}>Importar ahora</button></div></section>;
}

function LoadingDashboard() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="loading-block h-36 rounded-3xl" />)}</div>;
}
