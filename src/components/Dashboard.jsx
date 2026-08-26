import { useCallback, useEffect, useMemo, useState } from "react";
import {
  START_MONTH,
  calculateSummary,
  emptyFinanceData,
  expenseCategories,
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

const navItems = [
  { id: "summary", label: "Resumen", icon: "⌂" },
  { id: "transactions", label: "Movimientos", icon: "↕" },
  { id: "debts", label: "Deudas", icon: "◫" },
  { id: "investments", label: "Inversiones", icon: "◇" },
];

const actionByView = {
  summary: { label: "Nuevo movimiento", kind: "transaction" },
  transactions: { label: "Nuevo movimiento", kind: "transaction" },
  debts: { label: "Nueva deuda", kind: "debt" },
  investments: { label: "Nuevo estado", kind: "statement" },
};

export default function Dashboard({ user }) {
  const [view, setView] = useState("summary");
  const [selectedMonth, setSelectedMonth] = useState(START_MONTH);
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

  const summary = useMemo(() => calculateSummary(data, selectedMonth), [data, selectedMonth]);
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

  return (
    <div className="min-h-screen bg-transparent lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col bg-forest px-5 py-6 text-white lg:flex">
        <Brand />
        <nav className="mt-12 grid gap-1.5">
          {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />)}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-5">
          <div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#31594f] font-display text-sm">{displayName.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{displayName}</p><p className="truncate text-[10px] text-[#98b1a8]">{user.email}</p></div></div>
          <p className="mt-4 text-[10px] leading-4 text-[#87a299]">Información privada · Supabase</p>
          <button className="mt-3 text-xs font-semibold text-[#bbcec7] transition hover:text-white" onClick={() => authService.signOut()}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="min-w-0 pb-24 lg:col-start-2 lg:pb-10">
        <header className="sticky top-0 z-20 border-b border-line/90 bg-[#f2f5f3]/90 px-4 py-4 backdrop-blur-md sm:px-7 lg:px-9">
          <div className="mx-auto flex max-w-[1320px] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="hidden text-[10px] font-bold tracking-[.15em] text-green uppercase sm:block">Mi salud financiera</p><h1 className="font-display text-2xl tracking-[-.03em] sm:text-3xl">{title}</h1></div>
            <div className="flex items-center gap-2">
              <input className="min-w-0 flex-1 rounded-xl border border-line bg-white px-6 py-2.5 text-xs font-semibold text-forest sm:w-[190px] sm:flex-none" type="month" min={START_MONTH} value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
              <button className="rounded-xl bg-forest px-3.5 py-2.5 text-xs font-bold text-white shadow-[0_7px_20px_rgba(23,62,52,.16)] sm:px-4" onClick={() => setModal({ kind: action.kind, record: null })}><span className="mr-1 text-base leading-none">＋</span><span className="hidden sm:inline">{action.label}</span><span className="sm:hidden">Añadir</span></button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
          {legacyRows.length > 0 && <LegacyBanner count={legacyRows.length} busy={busy} onImport={importLegacy} onDismiss={omitLegacy} />}
          {message && <div className="mb-5 rounded-xl border border-[#cbded6] bg-white px-4 py-3 text-sm text-[#30594a] shadow-sm" role="status">{message}</div>}

          {loading ? <LoadingDashboard /> : (
            <>
              {view === "summary" && <SummaryView data={data} summary={summary} selectedMonth={selectedMonth} onEdit={(record) => setModal({ kind: "transaction", record })} />}
              {view === "transactions" && <TransactionsView rows={data.transactions} onEdit={(record) => setModal({ kind: "transaction", record })} onDelete={(record) => removeRecord("transaction", record)} />}
              {view === "debts" && <DebtsView data={data} onEdit={(record) => setModal({ kind: "debt", record })} onPay={(debt) => setModal({ kind: "payment", debt })} onDelete={(record) => removeRecord("debt", record)} />}
              {view === "investments" && <InvestmentsView statements={data.statements} onEdit={(record) => setModal({ kind: "statement", record })} onDelete={(record) => removeRecord("statement", record)} onCreate={() => setModal({ kind: "statement", record: null })} />}
            </>
          )}
        </div>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-white/10 bg-forest p-1.5 text-white shadow-[0_20px_50px_rgba(12,42,34,.3)] lg:hidden">
        {navItems.map((item) => <button key={item.id} className={`rounded-xl px-1 py-2 text-center transition ${view === item.id ? "bg-white/12" : "text-[#9eb6ad]"}`} onClick={() => setView(item.id)}><span className="block text-lg leading-none">{item.icon}</span><span className="mt-1 block text-[9px] font-semibold">{item.label}</span></button>)}
        <button className="rounded-xl px-1 py-2 text-center text-[#9eb6ad] transition hover:text-white" onClick={() => authService.signOut()}><span className="block text-lg leading-none">↪</span><span className="mt-1 block text-[9px] font-semibold">Salir</span></button>
      </nav>

      {modal && <RecordModal key={`${modal.kind}-${modal.record?.id || modal.debt?.id || "new"}`} modal={modal} busy={busy} onClose={() => setModal(null)} onSave={saveRecord} />}
    </div>
  );
}

function SummaryView({ data, summary, selectedMonth, onEdit }) {
  const categories = expenseCategories(data.transactions, selectedMonth);
  const maxCategory = categories[0]?.[1] || 1;
  const recent = data.transactions.slice(0, 5);
  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Patrimonio estimado" value={money(summary.netWorth)} meta="Balance + inversiones − deudas" tone="dark" />
        <Metric label="Ingresos del mes" value={money(summary.income)} meta="Ingresos netos registrados" />
        <Metric label="Egresos del mes" value={money(summary.expenses)} meta={`${summary.income ? (summary.expenses / summary.income * 100).toFixed(0) : 0}% de tus ingresos`} />
        <Metric label="Flujo del mes" value={money(summary.cashFlow)} meta={`${summary.availableRate.toFixed(0)}% disponible`} tone={summary.cashFlow < 0 ? "danger" : "green"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-7">
          <SectionTitle eyebrow="Distribución mensual" title="¿En qué se va tu dinero?" />
          <div className="mt-7 grid gap-4">
            {categories.length ? categories.slice(0, 6).map(([category, amount]) => <div key={category}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="font-semibold">{category}</span><span className="text-muted">{money(amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-green" style={{ width: `${Math.max(5, amount / maxCategory * 100)}%` }} /></div></div>) : <Empty compact text="Registra un egreso para ver la distribución por categorías." />}
          </div>
        </div>
        <div className="rounded-3xl bg-forest p-5 text-white sm:p-7">
          <p className="text-[10px] font-bold tracking-[.15em] text-[#8eb5a6] uppercase">Indicador general</p>
          <div className="mt-6 flex items-end justify-between"><strong className="font-display text-6xl font-medium">{summary.score}</strong><span className="mb-2 text-xs text-[#a8c0b7]">de 100</span></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#76b89e]" style={{ width: `${summary.score}%` }} /></div>
          <p className="mt-5 text-sm leading-6 text-[#b9cec6]">Combina tu flujo disponible y la carga mensual de deuda. Mejora al aumentar ingresos, reducir gastos o bajar cuotas.</p>
          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5"><SmallStat label="Deuda pendiente" value={money(summary.debt)} /><SmallStat label="Inversiones" value={money(summary.investments)} /></div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-7">
        <SectionTitle eyebrow="Actividad" title="Movimientos recientes" />
        <div className="mt-5"><TransactionTable rows={recent} onEdit={onEdit} condensed /></div>
      </section>
    </div>
  );
}

function TransactionsView({ rows, onEdit, onDelete }) {
  return <section className="rounded-3xl border border-line bg-white p-5 sm:p-7"><SectionTitle eyebrow={`${rows.length} registros`} title="Ingresos y egresos" subtitle="Puedes editar o eliminar cualquier movimiento manual después de guardarlo." /><div className="mt-6"><TransactionTable rows={rows} onEdit={onEdit} onDelete={onDelete} /></div></section>;
}

function TransactionTable({ rows, onEdit, onDelete, condensed = false }) {
  if (!rows.length) return <Empty text="Aún no hay movimientos. Usa “Nuevo movimiento” para comenzar." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[690px] border-collapse text-left">
        <thead><tr className="border-b border-line text-[10px] font-bold tracking-[.1em] text-muted uppercase"><th className="pb-3">Fecha</th><th className="pb-3">Detalle</th><th className="pb-3">Categoría</th><th className="pb-3 text-right">Monto</th><th className="pb-3 text-right">Acciones</th></tr></thead>
        <tbody>{rows.map((row) => { const automatic = row.source === "debt_payment"; return <tr key={row.id} className="border-b border-line/70 last:border-0"><td className="py-4 pr-4 text-xs text-muted">{shortDate(row.date)}</td><td className="py-4 pr-4"><div className="text-sm font-semibold">{row.description || (row.type === "income" ? "Ingreso" : "Egreso")}</div>{automatic && <span className="mt-1 inline-block rounded-full bg-[#edf4f1] px-2 py-1 text-[9px] font-bold text-green">PAGO AUTOMÁTICO</span>}</td><td className="py-4 pr-4 text-xs text-muted">{row.category}</td><td className={`py-4 text-right text-sm font-bold ${row.type === "income" ? "text-green" : "text-danger"}`}>{row.type === "income" ? "+" : "−"}{money(row.amount, row.currency)}</td><td className="py-4 pl-4 text-right">{automatic ? <span className="text-[10px] text-muted">Gestionar en Deudas</span> : <div className="flex justify-end gap-1"><ActionButton label="Editar" onClick={() => onEdit?.(row)}>Editar</ActionButton>{!condensed && <ActionButton label="Eliminar" danger onClick={() => onDelete?.(row)}>Eliminar</ActionButton>}</div>}</td></tr>; })}</tbody>
      </table>
    </div>
  );
}

function DebtsView({ data, onEdit, onPay, onDelete }) {
  const active = data.debts.filter((item) => item.status === "active");
  const paid = data.debts.filter((item) => item.status === "paid");
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 xl:grid-cols-2">
        {data.debts.length ? [...active, ...paid].map((debt) => {
          const paidAmount = Math.max(0, debt.originalAmount - debt.outstandingAmount);
          const progress = debt.originalAmount ? Math.min(100, paidAmount / debt.originalAmount * 100) : 0;
          return <article key={debt.id} className="rounded-3xl border border-line bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${debt.status === "paid" ? "bg-[#dcece5] text-green" : "bg-[#f4ede5] text-[#87653f]"}`}>{debt.status === "paid" ? "Pagada" : "Activa"}</span><h2 className="mt-3 font-display text-2xl">{debt.creditor}</h2></div><strong className="font-display text-2xl text-forest">{money(debt.outstandingAmount, debt.currency)}</strong></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-green" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-muted"><span>{progress.toFixed(0)}% pagado</span><span>Original: {money(debt.originalAmount, debt.currency)}</span></div><div className="mt-5 grid grid-cols-3 gap-2 border-y border-line py-4"><SmallStat label="Cuota" value={money(debt.monthlyPayment, debt.currency)} dark /><SmallStat label="Tasa anual" value={`${debt.annualRate}%`} dark /><SmallStat label="Vence" value={debt.dueDay ? `Día ${debt.dueDay}` : "—"} dark /></div><div className="mt-5 flex flex-wrap gap-2">{debt.status === "active" && <button className="rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white" onClick={() => onPay(debt)}>Registrar pago</button>}<ActionButton onClick={() => onEdit(debt)}>Editar</ActionButton><ActionButton danger onClick={() => onDelete(debt)}>Eliminar</ActionButton></div></article>;
        }) : <div className="xl:col-span-2"><Empty text="Aún no tienes deudas registradas. Añade una para seguir su saldo y pagos." /></div>}
      </section>
      <section className="rounded-3xl border border-line bg-white p-5 sm:p-7"><SectionTitle eyebrow={`${data.debtPayments.length} pagos`} title="Historial de pagos" subtitle="Cada pago también aparece como egreso en tus movimientos." /><div className="mt-5">{data.debtPayments.length ? <div className="grid gap-2">{data.debtPayments.map((payment) => { const debt = data.debts.find((item) => item.id === payment.debtId); return <div key={payment.id} className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3"><div><p className="text-sm font-semibold">{debt?.creditor || "Deuda eliminada"}</p><p className="mt-1 text-[10px] text-muted">{shortDate(payment.paymentDate)}{payment.notes ? ` · ${payment.notes}` : ""}</p></div><strong className="text-sm text-danger">−{money(payment.amount, debt?.currency || "PEN")}</strong></div>; })}</div> : <Empty compact text="Todavía no hay pagos registrados." />}</div></section>
    </div>
  );
}

function InvestmentsView({ statements, onEdit, onDelete, onCreate }) {
  const latest = statements[0];
  const result = latest ? latest.marketValue + latest.cashBalance + latest.dividends - latest.contributedCapital : 0;
  const returnRate = latest?.contributedCapital ? result / latest.contributedCapital * 100 : 0;
  return (
    <div className="grid gap-6">
      {latest ? <section className="grid gap-3 sm:grid-cols-3"><Metric label="Valor actual" value={money(latest.marketValue + latest.cashBalance, latest.currency)} meta={`Estado al ${shortDate(latest.statementDate)}`} tone="dark" /><Metric label="Capital aportado" value={money(latest.contributedCapital, latest.currency)} meta={latest.institution} /><Metric label="Resultado acumulado" value={`${result >= 0 ? "+" : ""}${money(result, latest.currency)}`} meta={`${returnRate.toFixed(2)}% sobre aportes`} tone={result < 0 ? "danger" : "green"} /></section> : null}
      <section className="rounded-3xl border border-line bg-white p-5 sm:p-7"><SectionTitle eyebrow={`${statements.length} estados`} title="Estados de cuenta" subtitle="Registra cada nuevo estado de Grupo Coril sin borrar el anterior; así conservas el historial." /><div className="mt-6">{statements.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-line text-[10px] font-bold tracking-[.1em] text-muted uppercase"><th className="pb-3">Fecha</th><th className="pb-3">Institución</th><th className="pb-3 text-right">Aportes</th><th className="pb-3 text-right">Valor</th><th className="pb-3 text-right">Dividendos</th><th className="pb-3 text-right">Acciones</th></tr></thead><tbody>{statements.map((row) => <tr key={row.id} className="border-b border-line/70 last:border-0"><td className="py-4 text-xs text-muted">{shortDate(row.statementDate)}</td><td className="py-4 text-sm font-semibold">{row.institution}</td><td className="py-4 text-right text-sm">{money(row.contributedCapital, row.currency)}</td><td className="py-4 text-right text-sm font-bold text-forest">{money(row.marketValue + row.cashBalance, row.currency)}</td><td className="py-4 text-right text-sm">{money(row.dividends, row.currency)}</td><td className="py-4 text-right"><div className="flex justify-end gap-1"><ActionButton onClick={() => onEdit(row)}>Editar</ActionButton><ActionButton danger onClick={() => onDelete(row)}>Eliminar</ActionButton></div></td></tr>)}</tbody></table></div> : <Empty text="Aún no hay estados de cuenta." action="Registrar el primero" onAction={onCreate} />}</div></section>
    </div>
  );
}

function Metric({ label, value, meta, tone }) {
  const tones = { dark: "bg-forest text-white border-forest", danger: "bg-white text-danger border-line", green: "bg-white text-green border-line" };
  return <article className={`rounded-3xl border p-5 ${tones[tone] || "border-line bg-white text-ink"}`}><p className={`text-[10px] font-bold tracking-[.12em] uppercase ${tone === "dark" ? "text-[#9db8ae]" : "text-muted"}`}>{label}</p><strong className="mt-5 block font-display text-3xl font-medium tracking-[-.03em]">{value}</strong><p className={`mt-2 text-[10px] ${tone === "dark" ? "text-[#a8c0b7]" : "text-muted"}`}>{meta}</p></article>;
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return <div><p className="text-[10px] font-bold tracking-[.15em] text-green uppercase">{eyebrow}</p><h2 className="mt-1 font-display text-2xl tracking-[-.02em]">{title}</h2>{subtitle && <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">{subtitle}</p>}</div>;
}

function SmallStat({ label, value, dark = false }) {
  return <div><p className={`text-[9px] font-bold tracking-[.08em] uppercase ${dark ? "text-muted" : "text-[#91ada2]"}`}>{label}</p><p className={`mt-1 text-xs font-bold ${dark ? "text-forest" : "text-white"}`}>{value}</p></div>;
}

function Empty({ text, compact = false, action, onAction }) {
  return <div className={`rounded-2xl border border-dashed border-[#cfd9d4] bg-[#f8faf9] text-center ${compact ? "p-6" : "p-10"}`}><p className="text-sm leading-6 text-muted">{text}</p>{action && <button className="mt-4 rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white" onClick={onAction}>{action}</button>}</div>;
}

function ActionButton({ children, danger = false, onClick, label }) {
  return <button type="button" aria-label={label} className={`rounded-lg px-2.5 py-2 text-[10px] font-bold transition ${danger ? "text-danger hover:bg-[#f8efed]" : "text-green hover:bg-[#edf4f1]"}`} onClick={onClick}>{children}</button>;
}

function NavButton({ item, active, onClick }) {
  return <button className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${active ? "bg-white/10 text-white" : "text-[#a8c0b7] hover:bg-white/5 hover:text-white"}`} onClick={onClick}><span className="grid size-6 place-items-center text-lg leading-none">{item.icon}</span>{item.label}</button>;
}

function Brand() {
  return <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white/90 font-display text-xl text-forest">K</span><div><strong className="font-display text-xl font-medium">Finanzas</strong><small className="block text-[10px] tracking-[.12em] text-[#a9c1b7] uppercase">Panel personal</small></div></div>;
}

function LegacyBanner({ count, busy, onImport, onDismiss }) {
  return <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#c9ded5] bg-[#eaf4ef] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-forest">Encontramos {count} movimientos de la versión local.</p><p className="mt-1 text-xs leading-5 text-[#58746a]">Impórtalos una sola vez a esta cuenta o descarta el aviso.</p></div><div className="flex shrink-0 gap-2"><button className="rounded-xl px-3 py-2 text-xs font-bold text-muted" onClick={onDismiss} disabled={busy}>Omitir</button><button className="rounded-xl bg-forest px-3 py-2 text-xs font-bold text-white" onClick={onImport} disabled={busy}>Importar ahora</button></div></section>;
}

function LoadingDashboard() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="loading-block h-36 rounded-3xl" />)}</div>;
}
