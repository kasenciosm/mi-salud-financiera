export const categories = [
  { name: 'Hogar', icon: 'house', color: 'lavender', aliases: ['hogar', 'vivienda', 'alquiler', 'casa', 'hipoteca'] },
  { name: 'Supermercado', icon: 'shopping-cart', color: 'mint', aliases: ['supermercado', 'super', 'abarrotes', 'mercado', 'alimentacion'] },
  { name: 'Restaurantes', icon: 'utensils', color: 'sand', aliases: ['restaurante', 'restaurantes', 'comida', 'delivery', 'cafe', 'cafeteria'] },
  { name: 'Movilidad', icon: 'car', color: 'sky', aliases: ['movilidad', 'transporte', 'taxi', 'gasolina', 'combustible', 'pasajes'] },
  { name: 'Compras', icon: 'shopping-bag', color: 'rose', aliases: ['compras', 'ropa', 'tiendas', 'vestimenta', 'muebles'] },
  { name: 'Ocio', icon: 'clapperboard', color: 'blue', aliases: ['ocio', 'entretenimiento', 'salidas', 'cine', 'juegos', 'suscripciones'] },
  { name: 'Salud', icon: 'heart-pulse', color: 'rose', aliases: ['salud', 'farmacia', 'medicina'] },
  { name: 'Servicios', icon: 'lightbulb', color: 'sand', aliases: ['servicios', 'luz', 'agua', 'internet', 'telefono'] },
  { name: 'Educación', icon: 'graduation-cap', color: 'lavender', aliases: ['educacion', 'estudios', 'universidad', 'cursos'] },
  { name: 'Pago de deuda', icon: 'credit-card', color: 'lavender', aliases: ['pago de deuda', 'deuda', 'prestamo', 'tarjeta'] },
  { name: 'Ingresos', icon: 'wallet', color: 'mint', aliases: ['ingresos', 'ingreso', 'sueldo', 'salario', 'ventas', 'fuxion'] },
  { name: 'Entidades', icon: 'bank', color: 'blue', aliases: ['entidades', 'tramites', 'impuestos', 'sunat', 'reniec', 'essalud', 'minsa'] },
];
export const paymentMethods = ['Efectivo', 'BCP', 'Interbank', 'BBVA', 'Scotiabank', 'Diners Club', 'Banco de la Nación', 'BanBif', 'Yape', 'Plin', 'Otro'];
// Identificadores locales: ninguna consulta de movimientos se envía a terceros.
export const merchants = [
  ['BCP', 'BCP', 'blue', ['bcp', 'banco de credito']], ['Interbank', 'ib', 'mint', ['interbank']],
  ['BBVA', 'BBVA', 'blue', ['bbva']], ['Scotiabank', 'S', 'rose', ['scotiabank']],
  ['Banco de la Nación', 'BN', 'rose', ['banco de la nacion']], ['BanBif', 'B', 'sky', ['banbif']],
  ['Diners Club', 'D', 'blue', ['diners', 'diners club']], ['Caja Arequipa', 'CA', 'rose', ['caja arequipa']],
  ['Caja Huancayo', 'CH', 'rose', ['caja huancayo']], ['Banco Pichincha', 'P', 'sand', ['pichincha']],
  ['Yape', 'Y', 'lavender', ['yape']], ['Plin', 'plin', 'sky', ['plin']],
  ['Falabella', 'f', 'mint', ['falabella']], ['Ripley', 'R', 'lavender', ['ripley']],
  ['Oechsle', 'O', 'rose', ['oechsle']], ['Plaza Vea', 'pv', 'sand', ['plaza vea', 'plazavea']],
  ['Wong', 'W', 'rose', ['wong']], ['Tottus', 'T', 'mint', ['tottus']],
  ['Metro', 'M', 'sand', ['metro']], ['Uber', 'Uber', 'neutral', ['uber']],
  ['Cabify', 'C', 'lavender', ['cabify']], ['inDrive', 'in', 'mint', ['indrive', 'in drive']],
  ['DiDi', 'D', 'sand', ['didi']], ['Rappi', 'R', 'rose', ['rappi']],
  ['PedidosYa', 'PY', 'rose', ['pedidosya', 'pedidos ya']],
  ['Pardos Chicken', 'P', 'sand', ['pardos chicken', 'pardos']], ['Norky’s', 'N', 'rose', ['norkys', 'norky s']],
  ['Bembos', 'B', 'sand', ['bembos']], ['KFC', 'KFC', 'rose', ['kfc']], ['Starbucks', 'S', 'mint', ['starbucks']],
  ['Cineplanet', 'CP', 'blue', ['cineplanet']], ['Cinemark', 'C', 'rose', ['cinemark']],
  ['SUNAT', 'SUNAT', 'rose', ['sunat']], ['RENIEC', 'R', 'blue', ['reniec']],
  ['EsSalud', 'E', 'mint', ['essalud', 'es salud']], ['MINSA', 'M', 'sky', ['minsa', 'ministerio de salud']],
  ['SIS', 'SIS', 'blue', ['sis', 'seguro integral de salud']], ['Clínica Internacional', 'CI', 'blue', ['clinica internacional']],
  ['Auna', 'A', 'rose', ['auna']], ['Clínica San Pablo', 'SP', 'sky', ['clinica san pablo', 'san pablo']],
  ['Inkafarma', 'I', 'rose', ['inkafarma']], ['Mifarma', 'M', 'rose', ['mifarma']],
  ['Netflix', 'N', 'rose', ['netflix']], ['Spotify', 'S', 'mint', ['spotify']],
  ['Metropolitano', 'bus', 'sky', ['metropolitano']], ['Bus / combi', 'bus', 'sky', ['combi', 'bus', 'micro']],
  ['Taxi', 'car-taxi-front', 'sand', ['taxi']], ['Restaurante', 'utensils', 'sand', ['restaurante']],
  ['Cafetería', 'coffee', 'sand', ['cafeteria']], ['Cine', 'clapperboard', 'blue', ['cine']],
  ['Grupo Coril', 'C', 'blue', ['grupo coril', 'coril']],
].map(([name, mark, color, aliases]) => ({ name, mark, color, aliases }));

export const normalizeLabel = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const matches = (text, alias) => (` ${text} `).includes(` ${alias} `);
export function categoryIdentity(name, type) {
  const key = normalizeLabel(name);
  return categories.find(c => c.aliases.some(alias => matches(key, alias))) ||
    (type === 'income' ? categories.find(c => c.name === 'Ingresos') : { name: name || 'Otros', icon: 'shapes', color: 'neutral' });
}
export function merchantIdentity(description) {
  const key = normalizeLabel(description);
  return merchants.find(m => m.aliases.some(alias => matches(key, alias))) || null;
}
