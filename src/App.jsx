import { useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";
import { authService } from "./financeService.js";
import { isSupabaseConfigured } from "./supabase.js";

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    authService.getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setChecking(false));

    const { data } = authService.onChange(setSession);
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <ConfigurationScreen />;
  if (checking) return <LoadingScreen />;
  if (!session) return <AuthScreen />;

  return <Dashboard user={session.user} />;
}

function LoadingScreen() {
  return <main className="grid min-h-screen place-items-center p-6"><div className="w-full max-w-sm rounded-3xl border border-line bg-white p-10 shadow-[0_24px_70px_rgba(23,62,52,.12)]"><div className="mb-7 grid size-12 place-items-center rounded-2xl bg-forest font-display text-2xl text-white">K</div><p className="text-[10px] font-bold tracking-[.18em] text-green">MI SALUD FINANCIERA</p><h1 className="mt-2 font-display text-4xl">Preparando tu cuenta…</h1><div className="loading-block mt-8 h-1.5 rounded-full" /></div></main>;
}

function ConfigurationScreen() {
  return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-xl rounded-3xl border border-line bg-white p-7 shadow-[0_24px_70px_rgba(23,62,52,.12)] sm:p-10"><div className="mb-7 grid size-12 place-items-center rounded-2xl bg-forest font-display text-2xl text-white">K</div><p className="text-[10px] font-bold tracking-[.18em] text-green">CONFIGURACIÓN INICIAL</p><h1 className="mt-2 font-display text-4xl">Conecta Supabase</h1><p className="mt-4 text-sm leading-7 text-muted">Copia <strong>.env.example</strong> como <strong>.env.local</strong>, agrega la URL y la publishable key de tu proyecto y reinicia Vite. El README contiene el procedimiento completo.</p><div className="mt-6 rounded-xl bg-[#f3f6f4] p-4 font-mono text-xs leading-6 text-[#35564b]">VITE_SUPABASE_URL=…<br />VITE_SUPABASE_PUBLISHABLE_KEY=…</div></section></main>;
}
