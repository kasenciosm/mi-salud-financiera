import { useEffect, useRef, useState } from "react";
import { DEFAULT_EXCHANGE_RATE, money, todayInLima } from "../finance.js";
import { categories, merchants, paymentMethods, merchantIdentity } from '../catalog.js';
import Identity from './Identity.jsx';

const inputClass = "w-full rounded-xl border border-line bg-[var(--surface-subtle)] px-3.5 py-3 text-sm text-ink outline-none transition focus:border-line focus:ring-4 focus:ring-green/10";

const definitions = {
  transaction: {
    createTitle: "Nuevo movimiento",
    editTitle: "Editar movimiento",
    submit: "Guardar movimiento",
  },
  debt: {
    createTitle: "Nueva deuda",
    editTitle: "Editar deuda",
    submit: "Guardar deuda",
  },
  statement: {
    createTitle: "Nuevo estado de cuenta",
    editTitle: "Editar estado de cuenta",
    submit: "Guardar estado",
  },
  payment: {
    createTitle: "Registrar pago",
    editTitle: "Registrar pago",
    submit: "Registrar pago",
  },
};

export default function RecordModal({ modal, busy, onClose, onSave }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('input,select,button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key === 'Tab') {
        const elements = dialogRef.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  const definition = definitions[modal.kind];
  const title = modal.record?.id ? definition.editTitle : definition.createTitle;

  function submit(event) {
    event.preventDefault();
    onSave(Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#102c25]/55 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section ref={dialogRef} className="my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/50 bg-white shadow-[0_30px_100px_rgba(10,35,28,.28)]" role="dialog" aria-modal="true" aria-labelledby="record-modal-title">
        <header className="flex items-start justify-between border-b border-line px-5 py-5 sm:px-7">
          <div>
            <p className="text-[11px] font-bold tracking-[.16em] text-green uppercase">Registro financiero</p>
            <h2 id="record-modal-title" className="mt-1 font-display text-3xl tracking-[-.03em]">{title}</h2>
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-full text-xl text-muted transition hover:bg-[var(--surface-subtle)] hover:text-ink" onClick={onClose} disabled={busy} aria-label="Cerrar">×</button>
        </header>

        <form className="max-h-[75vh] overflow-y-auto px-5 py-6 sm:px-7" onSubmit={submit}>
          {modal.kind === "transaction" && <TransactionFields record={modal.record || {}} />}
{modal.kind === "debt" && <DebtFields record={modal.record || {}} />}
{modal.kind === "statement" && <StatementFields record={modal.record || {}} />}
          {modal.kind === "payment" && <PaymentFields debt={modal.debt} />}
          {modal.error && <p className="mt-5 rounded-xl border border-line bg-[var(--surface-subtle)] px-4 py-3 text-xs leading-5 text-danger" role="alert">{modal.error}</p>}

          <div className="mt-7 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <button type="button" className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-muted transition hover:bg-[var(--surface-subtle)]" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white shadow-[0_8px_22px_rgba(23,62,52,.16)] disabled:cursor-wait disabled:opacity-60" disabled={busy}>{busy ? "Guardando…" : definition.submit}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TransactionFields({ record = {} }) {
  const [merchant, setMerchant] = useState(record.merchant || '');
  const [description, setDescription] = useState(record.description || '');
  const [category, setCategory] = useState(record.category || '');
  const identity = merchantIdentity(merchant || description);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Fecha"><input className={inputClass} name="date" type="date" min="2026-08-01" defaultValue={record.date || todayInLima()} required /></Field>
      <Field label="Tipo"><select className={inputClass} name="type" defaultValue={record.type || "income"}><option value="income">Ingreso</option><option value="expense">Egreso</option></select></Field>
      <Field label="Categoría"><input className={inputClass} name="category" list="finance-categories" value={category} onChange={e=>setCategory(e.target.value)} placeholder="Elige o escribe una categoría" required /><datalist id="finance-categories">{categories.map(c=><option key={c.name} value={c.name}/>)}</datalist></Field>
      <Field label="Comercio o entidad" hint="Opcional. Se usa para identificar el movimiento."><input className={inputClass} name="merchant" list="finance-merchants" value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder="Uber, Plaza Vea, Falabella…"/><datalist id="finance-merchants">{merchants.map(m=><option key={m.name} value={m.name}/>)}</datalist></Field>
      <Field label="Medio de pago"><select className={inputClass} name="paymentMethod" defaultValue={record.paymentMethod || ''}><option value="">Sin especificar</option>{paymentMethods.map(m=><option key={m}>{m}</option>)}{record.paymentMethod&&!paymentMethods.includes(record.paymentMethod)&&<option>{record.paymentMethod}</option>}</select></Field>
      <Field label="Descripción"><input className={inputClass} name="description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Detalle opcional" /></Field>
      <div className="identity-preview sm:col-span-2"><Identity name={merchant||description} category={category}/><span>{identity?`Identificado: ${identity.name}`:category||'Icono según categoría'}<small>Puedes cambiar el comercio y la categoría.</small></span></div>
      <Field label="Monto"><input className={inputClass} name="amount" type="number" min="0.01" step="0.01" defaultValue={record.amount ?? ""} required /></Field>
      <Field label="Moneda"><select className={inputClass} name="currency" defaultValue={record.currency || "PEN"}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></Field>
      <Field label="Tipo de cambio" hint="Solo se usa cuando la moneda es USD."><input className={inputClass} name="exchangeRate" type="number" min="0.0001" step="0.0001" defaultValue={record.exchangeRate ?? DEFAULT_EXCHANGE_RATE} required /></Field>
    </div>
  );
}

function DebtFields({ record = {} }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Acreedor"><input className={inputClass} name="creditor" defaultValue={record.creditor || ""} placeholder="Banco, persona o entidad" required /></Field>
      <Field label="Moneda"><select className={inputClass} name="currency" defaultValue={record.currency || "PEN"}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></Field>
      <Field label="Monto original"><input className={inputClass} name="originalAmount" type="number" min="0.01" step="0.01" defaultValue={record.originalAmount ?? ""} required /></Field>
      <Field label="Saldo pendiente"><input className={inputClass} name="outstandingAmount" type="number" min="0" step="0.01" defaultValue={record.outstandingAmount ?? record.originalAmount ?? ""} required /></Field>
      <Field label="Cuota mensual"><input className={inputClass} name="monthlyPayment" type="number" min="0" step="0.01" defaultValue={record.monthlyPayment ?? ""} /></Field>
      <Field label="Tasa anual (%)"><input className={inputClass} name="annualRate" type="number" min="0" step="0.01" defaultValue={record.annualRate ?? ""} /></Field>
      <Field label="Día de pago" hint="Un número del 1 al 31."><input className={inputClass} name="dueDay" type="number" min="1" max="31" step="1" defaultValue={record.dueDay ?? ""} /></Field>
    </div>
  );
}

function StatementFields({ record = {} }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Fecha del estado"><input className={inputClass} name="statementDate" type="date" min="2026-08-01" defaultValue={record.statementDate || todayInLima()} required /></Field>
      <Field label="Institución"><input className={inputClass} name="institution" defaultValue={record.institution || "Grupo Coril"} required /></Field>
      <Field label="Capital aportado"><input className={inputClass} name="contributedCapital" type="number" min="0" step="0.01" defaultValue={record.contributedCapital ?? ""} /></Field>
      <Field label="Valor de mercado"><input className={inputClass} name="marketValue" type="number" min="0" step="0.01" defaultValue={record.marketValue ?? ""} /></Field>
      <Field label="Dividendos acumulados"><input className={inputClass} name="dividends" type="number" min="0" step="0.01" defaultValue={record.dividends ?? ""} /></Field>
      <Field label="Saldo en efectivo"><input className={inputClass} name="cashBalance" type="number" min="0" step="0.01" defaultValue={record.cashBalance ?? ""} /></Field>
      <Field label="Moneda"><select className={inputClass} name="currency" defaultValue={record.currency || "PEN"}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></Field>
      <Field label="Notas"><textarea className={`${inputClass} min-h-24 resize-y`} name="notes" defaultValue={record.notes || ""} placeholder="Periodo, fondo u observaciones" /></Field>
    </div>
  );
}

function PaymentFields({ debt }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-[var(--surface-subtle)] p-4">
        <p className="text-xs font-semibold text-muted">Deuda seleccionada</p>
        <div className="mt-1 flex items-end justify-between gap-3"><strong className="font-display text-2xl font-medium">{debt.creditor}</strong><span className="text-sm font-bold text-forest">{money(debt.outstandingAmount, debt.currency)}</span></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha del pago"><input className={inputClass} name="paymentDate" type="date" min="2026-08-01" defaultValue={todayInLima()} required /></Field>
        <Field label={`Monto (${debt.currency})`}><input className={inputClass} name="amount" type="number" min="0.01" step="0.01" defaultValue={debt.monthlyPayment || ""} required /></Field>
      </div>
      <Field label="Notas"><input className={inputClass} name="notes" placeholder="Número de operación u observación" /></Field>
      <p className="rounded-xl border border-line bg-[var(--surface-subtle)] px-4 py-3 text-xs leading-5 text-muted">Este pago también crea automáticamente un egreso en la categoría “Pago de deuda” y actualiza el saldo pendiente.</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return <label className="grid content-start gap-2 text-xs font-semibold text-muted">{label}{children}{hint && <span className="font-normal leading-5 text-muted">{hint}</span>}</label>;
}
