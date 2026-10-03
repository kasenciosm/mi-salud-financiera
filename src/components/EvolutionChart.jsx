import { useEffect, useId, useRef, useState } from 'react';
import { money } from '../finance.js';
import { monthLabel } from '../monthlyReports.js';
import { chartDomain, chartMetrics, chartValue, evolutionSlots, fieldLabels } from '../chartData.js';

export default function EvolutionChart({ reports, loading, error, retry, onSelectMonth, initialMetric = 'net_worth', title = 'La evolución de tu dinero' }) {
  const [metric, setMetric] = useState(initialMetric);
  const [range, setRange] = useState(6);
  const [selected, setSelected] = useState(null);
  const slots = evolutionSlots(reports, range);
  const current = slots.find(s => s.month === selected) || slots.at(-1);
  const definition = chartMetrics[metric];
  return <section className="surface evolution-panel">
    <div className="section-heading"><h2>{title}</h2><div className="segmented" aria-label="Periodo del gráfico">{[6,12].map(n => <button key={n} aria-pressed={range === n} onClick={() => setRange(n)}>{n} meses</button>)}</div></div>
    <div className="chart-toolbar"><div className="segmented metric-tabs" aria-label="Indicador del gráfico">{['net_worth','flow','debt'].map(key => <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{chartMetrics[key].label}</button>)}</div><select aria-label="Más indicadores" value={metric} onChange={e => setMetric(e.target.value)}>{Object.entries(chartMetrics).map(([key,m]) => <option key={key} value={key}>{m.label}</option>)}</select></div>
    {error ? <div role="alert" className="empty-state">{error}<button className="text-action" onClick={retry}>Volver a intentar</button></div> : loading ? <p className="empty-state" role="status">Cargando tu evolución…</p> : !slots.length ? <p className="empty-state">Tu evolución aparecerá aquí con el primer cierre mensual.</p> : <>
      <div className="chart-detail" aria-live="polite"><span className="capitalize">{monthLabel(current.month)}</span>{definition.fields.map((field,i) => <span key={field}><i className={`legend-dot color-${definition.colors[i]}`} />{fieldLabels[field]}: <strong>{chartValue(current.report,field) == null ? 'Sin datos' : money(chartValue(current.report,field))}</strong></span>)}</div>
      <LinePlot slots={slots} metric={metric} selected={current.month} onSelect={setSelected} />
      <div className="chart-footer"><span>Cierres mensuales · Soles (S/)</span>{current.report ? <button className="text-action" onClick={() => onSelectMonth(current.month)}>Ver cierre de {monthLabel(current.month)}</button> : <span>Cierre no disponible</span>}</div>
    </>}
  </section>;
}

function LinePlot({ slots, metric, selected, onSelect }) {
  const ref = useRef(null);
  const [width,setWidth] = useState(600);
  const uid = useId().replaceAll(':','');
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width)); observer.observe(ref.current); return () => observer.disconnect(); }, []);
  const { fields, colors, label } = chartMetrics[metric];
  const [min,max] = chartDomain(slots, fields);
  const left = width < 400 ? 55 : 68, right = 15, top = 16, bottom = 173;
  const plotWidth = Math.max(1,width-left-right);
  const x = i => slots.length === 1 ? left + plotWidth / 2 : left + i*plotWidth/(slots.length-1);
  const y = value => bottom-(value-min)/(max-min)*(bottom-top);
  const formatter = new Intl.NumberFormat('es-PE',{notation:'compact',maximumFractionDigits:1});
  const shortMonth = value => new Intl.DateTimeFormat('es-PE',{month:'short',timeZone:'UTC'}).format(new Date(`${value}-01T00:00:00Z`));
  const tickEvery = Math.max(1, Math.ceil((slots.length - 1) / (width < 400 ? 3 : 6)));
  const hasValues = slots.some(s => fields.some(f => chartValue(s.report,f) !== null));
  return <div className="line-plot" ref={ref}>
    {!hasValues ? <p className="empty-state">No hay datos históricos de {label.toLowerCase()} para este periodo.</p> : <>
      <svg width="100%" height="211" viewBox={`0 0 ${width} 211`} role="img" aria-label={`${label} por mes, en soles. Selecciona un mes debajo para consultar sus cifras.`}>
        <defs>{colors.map(color => <linearGradient key={color} id={`${uid}-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={`var(--${color})`} stopOpacity=".14"/><stop offset="100%" stopColor={`var(--${color})`} stopOpacity=".015"/></linearGradient>)}</defs>
        {[min,(min+max)/2,max].map((v,i) => <g key={i}><line x1={left} x2={width-right} y1={y(v)} y2={y(v)} stroke="var(--color-line)"/><text x={left-9} y={y(v)+4} textAnchor="end" fill="var(--color-muted)" fontSize="11">{formatter.format(v)}</text></g>)}
        {fields.map((field,f) => {
          // Los tramos se cortan en meses ausentes; nunca se dibuja un cero ficticio.
          const segments=[]; let segment=[];
          slots.forEach((slot,i) => {const value=chartValue(slot.report,field); if(value==null){if(segment.length)segments.push(segment);segment=[];}else segment.push([x(i),y(value)]);});
          if(segment.length)segments.push(segment);
          return <g key={field}>{segments.map((points,i) => {const path=points.map(([px,py],j)=>`${j?'L':'M'}${px},${py}`).join(' ');return <g key={i}>{fields.length===1&&points.length>1&&<path d={`${path} L${points.at(-1)[0]},${bottom} L${points[0][0]},${bottom} Z`} fill={`url(#${uid}-${colors[f]})`}/>}<path d={path} fill="none" stroke={`var(--${colors[f]})`} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/></g>;})}{slots.map((slot,i)=>{const value=chartValue(slot.report,field);return value==null?null:<circle key={slot.month} cx={x(i)} cy={y(value)} r={slot.month===selected?4:2.5} fill="var(--surface)" stroke={`var(--${colors[f]})`} strokeWidth="2"><title>{monthLabel(slot.month)} · {fieldLabels[field]}: {money(value)}</title></circle>;})}</g>;
        })}
        {slots.map((s,i)=>(i%tickEvery===0||i===slots.length-1)&&<text key={s.month} x={x(i)} y="200" textAnchor={i===0?'start':i===slots.length-1?'end':'middle'} fontSize="11" fill="var(--color-muted)">{shortMonth(s.month)}</text>)}
      </svg>
      <div className="month-targets" style={{left, right}}>{slots.map(s=><button key={s.month} className={s.month===selected?'selected':''} aria-label={`Consultar ${monthLabel(s.month)}`} aria-pressed={s.month===selected} onClick={()=>onSelect(s.month)}><span className="sr-only">{monthLabel(s.month)}</span></button>)}</div>
    </>}
  </div>;
}
