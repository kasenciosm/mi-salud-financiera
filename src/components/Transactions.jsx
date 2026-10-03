import { useState } from 'react';
import { money, shortDate } from '../finance.js';
import Identity from './Identity.jsx';
export default function Transactions({ rows, selectedMonth, category, onCategory, onEdit, onDelete }) {
  const [allMonths,setAllMonths] = useState(false);
  const options = [...new Set(rows.map(r=>r.category))].sort((a,b)=>a.localeCompare(b,'es'));
  const visible = rows.filter(r=>(allMonths||r.date.startsWith(selectedMonth))&&(!category||r.category===category));
  return <div className="view-stack"><div className="page-intro"><h1>Tus movimientos.</h1><p>Cada ingreso y gasto, en su lugar.</p></div><section className="surface"><div className="section-heading"><h2>{visible.length} movimientos</h2></div><div className="filter-bar"><select aria-label="Filtrar por categoría" value={category} onChange={e=>onCategory(e.target.value)}><option value="">Todas las categorías</option>{options.map(c=><option key={c}>{c}</option>)}</select><label className="check-label"><input type="checkbox" checked={allMonths} onChange={e=>setAllMonths(e.target.checked)}/>Todos los meses</label></div><TransactionList rows={visible} onEdit={onEdit} onDelete={onDelete}/></section></div>;
}
export function TransactionList({ rows, onEdit, onDelete, condensed = false }) {
  if (!rows.length) return <p className="empty-state">No hay movimientos en esta selección.</p>;
  return <div className="transaction-list">{rows.map(row=><article className="transaction-row" key={row.id}><Identity name={row.merchant || row.description} category={row.category} type={row.type}/><div className="transaction-info"><strong>{row.merchant || row.description || (row.type==='income'?'Ingreso':'Gasto')}</strong><p>{row.category}{row.paymentMethod ? ` · ${row.paymentMethod}` : ''} · {shortDate(row.date)}</p>{row.merchant && row.description && !condensed && <p>{row.description}</p>}{row.source==='debt_payment'&&<small className="status-pill">Pago de deuda</small>}</div><div className="transaction-end"><strong className={row.type==='income'?'positive':''}>{row.type==='income'?'+':'−'}{money(row.amount,row.currency)}</strong>{row.source==='debt_payment'?<small className="muted">Gestionar en Deudas</small>:<div className="row-actions"><button className="text-action" aria-label={`Editar ${row.merchant||row.description||row.category}`} onClick={()=>onEdit(row)}>Editar</button>{onDelete&&!condensed&&<button className="text-action danger" aria-label={`Eliminar ${row.merchant||row.description||row.category}`} onClick={()=>onDelete(row)}>Eliminar</button>}</div>}</div></article>)}</div>;
}
