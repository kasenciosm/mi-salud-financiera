import { House, ShoppingCart, Utensils, Car, ShoppingBag, Clapperboard, HeartPulse, Lightbulb, GraduationCap, CreditCard, Wallet, Shapes, Bus, CarTaxiFront, Coffee, ArrowDownUp, ChartNoAxesCombined, ChartPie, Plus, LogOut, SunMoon, ChevronRight, Check, LockKeyhole, X, Landmark, BookOpen, Pill, Hospital } from 'lucide-react';
import { categoryIdentity, merchantIdentity } from '../catalog.js';
const icons = { house: House, 'shopping-cart': ShoppingCart, utensils: Utensils, car: Car, 'shopping-bag': ShoppingBag, clapperboard: Clapperboard, 'heart-pulse': HeartPulse, lightbulb: Lightbulb, 'graduation-cap': GraduationCap, 'credit-card': CreditCard, wallet: Wallet, shapes: Shapes, bus: Bus, 'car-taxi-front': CarTaxiFront, coffee: Coffee, movements: ArrowDownUp, evolution: ChartNoAxesCombined, investments: ChartPie, plus: Plus, logout: LogOut, theme: SunMoon, right: ChevronRight, check: Check, lock: LockKeyhole, close: X, bank: Landmark, 'book-open': BookOpen, pill: Pill, hospital: Hospital };
const brandColors = {
  'BCP': ['#073b78', '#ff8a00'], 'Interbank': ['#00a94f', '#ffffff'], 'BBVA': ['#072146', '#ffffff'],
  'Scotiabank': ['#cf142b', '#ffffff'], 'Banco de la Nación': ['#f2c811', '#17336b'], 'BanBif': ['#114a8a', '#ffffff'],
  'Diners Club': ['#0077a8', '#ffffff'], 'Caja Arequipa': ['#f3f4f6', '#c9102b'], 'Caja Huancayo': ['#f3f4f6', '#c92127'],
  'Banco Pichincha': ['#f5c400', '#102b59'], 'Yape': ['#741d9d', '#ffffff'], 'Plin': ['#e9348b', '#ffffff'],
  'Falabella': ['#f3f4f6', '#599c3b'], 'Ripley': ['#d71920', '#ffffff'], 'Oechsle': ['#522c80', '#ffffff'],
  'Plaza Vea': ['#f0f5eb', '#70a83b'], 'Wong': ['#da1b27', '#ffffff'], 'Tottus': ['#eaf5f0', '#078040'],
  'Metro': ['#eaf1f7', '#0458a5'], 'Uber': ['#ffffff', '#111111'], 'Cabify': ['#512f87', '#ffffff'],
  'inDrive': ['#c9f264', '#102d14'], 'DiDi': ['#fff4dc', '#fc6927'], 'Rappi': ['#fce9e9', '#ec3324'],
  'PedidosYa': ['#ed1c24', '#ffffff'], 'KFC': ['#c41230', '#ffffff'], 'Starbucks': ['#00704a', '#ffffff'],
  'Netflix': ['#141414', '#e50914'], 'Spotify': ['#191414', '#1ed760'], 'SUNAT': ['#b90d30', '#ffffff'],
  'RENIEC': ['#eaf3ff', '#0067ad'], 'EsSalud': ['#e5f6f2', '#008b74'], 'MINSA': ['#e8f4fa', '#0073a8'],
  'SIS': ['#eff6fb', '#0066a4'], 'Clínica Internacional': ['#edf5fc', '#00599c'], 'Auna': ['#fceff1', '#df3260'],
  'Clínica San Pablo': ['#ecf4fb', '#1266a7'], 'Inkafarma': ['#fff1f2', '#ed1c24'], 'Mifarma': ['#fff1f2', '#dd1837'],
};
export function Icon({ name, size = 19, ...props }) { const Component = icons[name] || Shapes; return <Component size={size} strokeWidth={1.75} aria-hidden="true" {...props} />; }
export default function Identity({ name, category, type, categoryOnly = false }) {
  const merchant = categoryOnly ? null : merchantIdentity(name);
  const identity = merchant || categoryIdentity(category || name, type);
  const colors = merchant && brandColors[merchant.name];
  const brandStyle = colors ? { '--brand-bg': colors[0], '--brand-ink': colors[1] } : undefined;
  return <span className={`identity tint-${identity.color}${merchant ? ' merchant-mark' : ''}`} style={brandStyle} aria-hidden="true">{merchant ? (icons[merchant.mark] ? <Icon name={merchant.mark} /> : <span className={merchant.mark.length > 3 ? 'small-mark' : ''}>{merchant.mark}</span>) : <Icon name={identity.icon} />}</span>;
}
