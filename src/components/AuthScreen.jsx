import { useState } from "react";
import { authService } from "../financeService.js";

const inputClass = "w-full rounded-xl border border-line bg-[var(--surface-subtle)] px-3.5 py-3 text-sm text-ink outline-none transition focus:border-line focus:ring-4 focus:ring-green/10";

export default function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register") {
        if (form.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
        const data = await authService.signUp(form);
        if (!data.session) setMessage("Cuenta creada. Revisa tu correo para confirmar el registro.");
      } else {
        await authService.signIn(form);
      }
    } catch (error) {
      setMessage(translateAuthError(error.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="auth-intro hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white/90 font-display text-xl text-forest">K</span><div><strong className="font-display text-xl font-medium">Finanzas</strong><small className="block text-[11px] tracking-[.12em] text-muted uppercase">Panel personal</small></div></div>
        <div className="max-w-xl"><p className="text-[11px] font-bold tracking-[.2em] text-muted uppercase">Tu información, en perspectiva</p><h1 className="mt-5 font-display text-6xl leading-[1.05] tracking-[-.04em]">Ordena tu dinero.<br />Decide con claridad.</h1><p className="mt-7 max-w-md text-sm leading-7 text-muted">Ingresos, egresos, deudas e inversiones reunidos en un espacio privado para cada usuario.</p></div>
        <p className="text-xs text-muted">Protegido con autenticación y reglas de acceso por usuario.</p>
      </section>

      <section className="grid place-items-center p-5 sm:p-10">
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-[0_24px_70px_rgba(23,62,52,.09)] sm:p-9">
          <div className="mb-7 grid size-11 place-items-center rounded-xl bg-forest font-display text-xl text-white lg:hidden">K</div>
          <p className="text-[11px] font-bold tracking-[.18em] text-green">MI SALUD FINANCIERA</p>
          <h2 className="mt-2 font-display text-4xl tracking-[-.03em]">{mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{mode === "login" ? "Ingresa para consultar tus registros personales." : "Cada cuenta tendrá información financiera independiente."}</p>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-[var(--surface-subtle)] p-1 text-xs">
            <button className={`rounded-lg px-3 py-2.5 font-semibold ${mode === "login" ? "bg-white text-forest shadow-sm" : "text-muted"}`} onClick={() => { setMode("login"); setMessage(""); }}>Iniciar sesión</button>
            <button className={`rounded-lg px-3 py-2.5 font-semibold ${mode === "register" ? "bg-white text-forest shadow-sm" : "text-muted"}`} onClick={() => { setMode("register"); setMessage(""); }}>Crear cuenta</button>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            {mode === "register" && <label className="grid gap-2 text-xs font-semibold text-muted">Nombre<input className={inputClass} name="name" autoComplete="name" required /></label>}
            <label className="grid gap-2 text-xs font-semibold text-muted">Correo electrónico<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>
            <label className="grid gap-2 text-xs font-semibold text-muted">Contraseña<input className={inputClass} name="password" type="password" minLength="8" autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
            {message && <p className="rounded-xl border border-line bg-[var(--surface-subtle)] px-4 py-3 text-xs leading-5 text-muted" role="status">{message}</p>}
            <button className="mt-2 rounded-xl bg-forest px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(23,62,52,.16)] disabled:cursor-wait disabled:opacity-60" disabled={busy}>{busy ? "Procesando…" : mode === "login" ? "Ingresar" : "Crear cuenta"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function translateAuthError(message) {
  const value = message.toLowerCase();
  if (value.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (value.includes("user already registered")) return "Ya existe una cuenta con este correo.";
  if (value.includes("email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
  return message;
}
