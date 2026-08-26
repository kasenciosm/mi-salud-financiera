# Mi Salud Financiera — versión multiusuario

Panel financiero personal construido con **React, Vite y Tailwind CSS**. Usa **Supabase** como backend: autenticación, base de datos PostgreSQL y reglas de seguridad por usuario. Está preparado para publicarse en Vercel.

## Funciones incluidas

- Registro, confirmación de correo, inicio y cierre de sesión.
- Datos aislados por usuario mediante Row Level Security (RLS).
- Crear, editar y eliminar ingresos y egresos.
- Crear, editar y eliminar deudas.
- Registrar pagos de deuda: reduce el saldo y crea automáticamente el egreso.
- Registrar, editar y eliminar estados de cuenta de inversiones (Grupo Coril).
- Balance mensual, patrimonio estimado, distribución de gastos e indicador de salud.
- Importación opcional de los movimientos guardados por la versión anterior en `localStorage`.
- Diseño responsive para computadora y celular.

## 1. Requisitos

- Node.js 22.13 o superior (Node 24 LTS también funciona).
- Una cuenta gratuita en Supabase.
- VS Code.

## 2. Crear el backend en Supabase

1. Entra en [Supabase](https://supabase.com/dashboard) y crea un proyecto.
2. Abre **SQL Editor**, crea una consulta nueva y pega todo el contenido de `supabase/schema.sql`.
3. Pulsa **Run**. Se crearán las cuatro tablas, las políticas RLS y la función segura para pagar deudas.
4. Abre **Project Settings → API** (en algunas versiones aparece dentro de **Connect**) y copia:
   - Project URL.
   - Publishable key. Si tu proyecto antiguo muestra una `anon key`, también es compatible.

Nunca copies una `service_role key` o secret key dentro de este frontend.

## 3. Configurar el proyecto en Windows

Abre la carpeta en VS Code. En la terminal PowerShell ejecuta:

```powershell
Copy-Item .env.example .env.local
npm install
```

Edita `.env.local` y pega tus valores reales:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

Inicia la aplicación:

```powershell
npm run dev
```

Abre `http://localhost:5173`.

## 4. Configurar los correos de acceso

En Supabase abre **Authentication → URL Configuration**:

- Site URL durante el desarrollo: `http://localhost:5173`
- Redirect URLs: agrega `http://localhost:5173/**`

La confirmación por correo puede permanecer activa. Al crear una cuenta, el usuario tendrá que abrir el enlace enviado por Supabase antes de iniciar sesión.

## 5. Probar el aislamiento de usuarios

1. Crea una cuenta A y registra un movimiento.
2. Cierra sesión.
3. Crea una cuenta B con otro correo.
4. Verifica que la cuenta B comience sin registros.

No basta con ocultar datos desde React: `supabase/schema.sql` activa RLS para que PostgreSQL también bloquee el acceso a registros de otros usuarios.

## 6. Publicar en Vercel

1. Sube esta carpeta a un repositorio de GitHub e impórtalo en Vercel.
2. Vercel detectará Vite. El comando de build es `npm run build` y la carpeta de salida es `dist`.
3. En **Project Settings → Environment Variables** agrega las mismas dos variables de `.env.local`.
4. Despliega o vuelve a desplegar el proyecto.
5. Copia tu dominio `https://tu-proyecto.vercel.app`.
6. Regresa a **Supabase → Authentication → URL Configuration**:
   - cambia Site URL por tu dominio de Vercel;
   - agrega `https://tu-proyecto.vercel.app/**` a Redirect URLs;
   - conserva también `http://localhost:5173/**` para seguir desarrollando localmente.

## Comandos

| Comando | Función |
| --- | --- |
| `npm run dev` | Ejecuta el frontend localmente. |
| `npm run test` | Prueba cálculos y validaciones. |
| `npm run build` | Genera la versión de producción. |
| `npm run check` | Ejecuta pruebas y compilación. |

## Estructura principal

```text
src/App.jsx                    Sesión y pantallas iniciales
src/components/AuthScreen.jsx Registro e inicio de sesión
src/components/Dashboard.jsx  Resumen y CRUD de todos los módulos
src/components/RecordModal.jsx Formularios reutilizables
src/finance.js                 Cálculos y validación
src/financeService.js          Consultas a Supabase
src/supabase.js                Cliente y sesión
supabase/schema.sql            Tablas, RLS y función de pagos
tests/                         Pruebas automáticas
```

Consulta también `GUIA-CODIGO.md` para seguir el recorrido de cada operación en el código.
