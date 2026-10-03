import { House, ShoppingCart, Utensils, Car, ShoppingBag, Clapperboard, HeartPulse, Lightbulb, GraduationCap, CreditCard, Wallet, Shapes, Bus, CarTaxiFront, Coffee, ArrowDownUp, ChartNoAxesCombined, ChartPie, Plus, LogOut, SunMoon, ChevronRight, Check, LockKeyhole, X, Landmark } from 'lucide-react';
import { categoryIdentity, merchantIdentity } from '../catalog.js';
const icons = { house: House, 'shopping-cart': ShoppingCart, utensils: Utensils, car: Car, 'shopping-bag': ShoppingBag, clapperboard: Clapperboard, 'heart-pulse': HeartPulse, lightbulb: Lightbulb, 'graduation-cap': GraduationCap, 'credit-card': CreditCard, wallet: Wallet, shapes: Shapes, bus: Bus, 'car-taxi-front': CarTaxiFront, coffee: Coffee, movements: ArrowDownUp, evolution: ChartNoAxesCombined, investments: ChartPie, plus: Plus, logout: LogOut, theme: SunMoon, right: ChevronRight, check: Check, lock: LockKeyhole, close: X, bank: Landmark };
export function Icon({ name, size = 19, ...props }) { const Component = icons[name] || Shapes; return <Component size={size} strokeWidth={1.75} aria-hidden="true" {...props} />; }
export default function Identity({ name, category, type, categoryOnly = false }) {
  const merchant = categoryOnly ? null : merchantIdentity(name);
  const identity = merchant || categoryIdentity(category || name, type);
  return <span className={`identity tint-${identity.color}`} aria-hidden="true">{merchant ? (icons[merchant.mark] ? <Icon name={merchant.mark} /> : <span className={merchant.mark.length > 3 ? 'small-mark' : ''}>{merchant.mark}</span>) : <Icon name={identity.icon} />}</span>;
}
