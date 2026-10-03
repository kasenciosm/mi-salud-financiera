import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryIdentity, merchantIdentity } from '../src/catalog.js';
import { chartDomain, chartValue, evolutionSlots } from '../src/chartData.js';
import { normalizeTransaction } from '../src/finance.js';
test('identifica comercios peruanos y categorías sin confundir palabras parciales',()=>{
  assert.equal(merchantIdentity('Viaje con Uber a casa').name,'Uber');
  assert.equal(merchantIdentity('Compra en PlazaVea').name,'Plaza Vea');
  assert.equal(merchantIdentity('Metropolitano').name,'Metropolitano');
  assert.equal(merchantIdentity('suscripción cualquiera'),null);
  assert.equal(merchantIdentity('supermercado'),null);
  assert.equal(categoryIdentity('EDUCACIÓN').icon,'graduation-cap');
  assert.equal(categoryIdentity('Personalizada').icon,'shapes');
});
test('conserva por separado comercio, categoría, descripción y banco',()=>{
  const result=normalizeTransaction({date:'2026-10-01',type:'expense',amount:18.5,category:'Movilidad',merchant:' Uber ',paymentMethod:'BCP',description:'Viaje a casa'});
  assert.equal(result.merchant,'Uber');assert.equal(result.category,'Movilidad');assert.equal(result.paymentMethod,'BCP');assert.equal(result.description,'Viaje a casa');
});
test('evolución usa cierres sin inventar ceros, excluir el mes actual ni unir huecos',()=>{
  const reports=[{month:'2026-07-01',closed_at:'x',net_worth:0},{month:'2026-09-01',closed_at:'x',net_worth:-250},{month:'2026-10-01',closed_at:null,net_worth:500}];
  const slots=evolutionSlots(reports,6,'2026-10');
  assert.deepEqual(slots.map(s=>s.month),['2026-07','2026-08','2026-09']);
  assert.equal(chartValue(slots[0].report,'net_worth'),0);
  assert.equal(chartValue(slots[1].report,'net_worth'),null);
  assert.equal(chartValue({debt:500,debt_history_available:false},'debt'),null);
  const [min,max]=chartDomain(slots,['net_worth']);assert.ok(min < -250 && max > 0);
  assert.deepEqual(evolutionSlots([],12,'2026-10'),[]);
});
