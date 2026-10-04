# Activar deudas en cuotas

La actualización de tarjetas necesita agregar campos a Supabase antes de publicar esta versión.

1. Abre el proyecto de Supabase que usa la app y entra a **SQL Editor**.
2. Abre `supabase/tarjetas-cuotas.sql`, copia el archivo completo y pégalo en una consulta nueva.
3. Ejecuta la consulta. Es una migración aditiva e idempotente: conserva tus filas, políticas RLS y tablas existentes; puedes repetirla si necesitas volver a intentarlo.

Al registrar una tarjeta se calcula una cuota mensual estimada con el capital original, la tasa anual ingresada y el número de cuotas. Cada pago registra por separado el interés estimado del periodo y el capital amortizado. Las deudas normales mantienen su comportamiento actual.
