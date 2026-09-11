# Reportes mensuales — Mi salud financiera

Actualización preparada sobre el repositorio `kasenciosm/mi-salud-financiera`, revisión `1a6e0489e8d27cebcfa1a66d485ff6853881dc7f`.

## Qué incluye

- Sección **Reportes**, adaptada a móvil y escritorio.
- Reporte del mes en curso y cierres guardados de meses anteriores.
- Ingresos, gastos, saldo mensual, balance acumulado, deudas, inversiones y patrimonio estimado.
- Gráfico de los últimos 6 o 12 meses cerrados. Permite elegir el indicador.
- Historial con acceso al detalle de cada mes.
- Cierre en Supabase al cambiar de mes según `America/Lima`, sin depender de abrir la web.
- Protección de meses cerrados en la base de datos y separación de reportes por usuario.

## Activación (pendiente en tu proyecto publicado)

1. En tu proyecto Supabase, abre **SQL Editor → New query**. Copia el contenido completo de `supabase/monthly-reports.sql` y ejecútalo. Este archivo amplía las tablas existentes: **no vuelvas a ejecutar ni reemplaces `schema.sql`**.
2. Comprueba en **Integrations → Cron** que exista y esté activo `finance-monthly-close`. Si Supabase pide habilitar `pg_cron`, actívalo en esa sección y vuelve a ejecutar el archivo completo.
3. Copia los archivos de esta actualización en tu repositorio local. Conserva tu `.env.local`, tu configuración de Vercel y los cambios propios que hayas hecho después de la revisión indicada arriba.
4. Ejecuta `npm install` y `npm run check`.
5. Sube los cambios a GitHub con tu flujo habitual. Vercel generará el nuevo despliegue.
6. Inicia sesión y abre **Reportes**. Comprueba el reporte actual y el historial de cierres.

El ZIP es un proyecto completo actualizado y no contiene credenciales, datos reales, `.git`, `node_modules` ni archivos de configuración privada.

## Cómo funciona el cierre

El trabajo se ejecuta al inicio de cada hora: incluye las **00:00 de Perú** y recupera cierres pendientes si la base estuvo pausada. Solo procesa meses terminados, guarda una fila por usuario y mes y nunca sobrescribe un cierre existente. El instante programado puede tener un pequeño retraso de ejecución. La base debe estar activa para ejecutar trabajos.

La primera activación reconstruye los meses anteriores desde agosto de 2026 o desde el inicio de los registros del usuario, el que corresponda según el esquema de la app. Los meses sin movimientos también tienen cierre con cero ingresos y gastos; un cierre faltante se muestra como pendiente, no como cero.

Una vez activado, los movimientos, pagos y estados de inversión de meses anteriores quedan protegidos contra inserción, edición o eliminación retroactiva. Un ajuste se registra en el mes actual. La app mostrará un mensaje si se intenta cambiar un periodo cerrado. Eliminar una deuda con pagos de meses cerrados también queda impedido para conservar ese historial.

## Cálculos y límites del historial

- **Saldo mensual:** ingresos del mes menos gastos del mes.
- **Balance acumulado:** ingresos menos gastos registrados hasta el fin del mes. No equivale necesariamente a un saldo bancario real si faltan movimientos o saldo inicial.
- **Saldo / ingresos:** saldo mensual dividido entre ingresos; puede ser negativo. Sin ingresos se muestra “Sin ingresos”.
- **Deudas:** saldo vigente al finalizar el mes. Se añade un historial de cambios para preservar esa información aunque luego se edite una deuda.
- **Antes de activar el historial:** la deuda, el patrimonio y el indicador de salud históricos quedan no disponibles; no se sustituye el pasado por el saldo actual.
- **Inversiones:** último estado de cuenta con fecha no posterior al mes, siguiendo la lógica actual de la app. Se muestra su fecha; no se inventa una valoración si faltan estados nuevos. Esta versión mantiene el modelo actual de un último estado global, no suma carteras independientes.
- **Monedas:** movimientos con su tipo de cambio registrado; deudas e inversiones en dólares al tipo estimado de S/3,75 que ya utiliza la app. No es una cotización en tiempo real.
- **Patrimonio estimado:** balance acumulado + inversiones − deudas, con las mismas limitaciones de registro de la app.

## Verificación realizada

- 11 pruebas de cálculos y fechas.
- 9 escenarios de base de datos ejecutados con PostgreSQL embebido (PGlite): cambio de mes en Lima, recuperación de cierres, conservación del saldo de deuda, aislamiento de usuarios, bloqueo de periodos e instalación repetida.
- El planificador `pg_cron` se simula en las pruebas locales; su ejecución real debe comprobarse en **Cron → History** después de instalar la actualización.
- Compilación de producción.
- Pruebas de interfaz en Chrome a 320, 360, 390, 768 y 1440 px, cambios de indicador, selección de meses, estado vacío y falta de migración. Datos de prueba, sin acceso a registros reales.

Documentación oficial de la programación utilizada: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart).
