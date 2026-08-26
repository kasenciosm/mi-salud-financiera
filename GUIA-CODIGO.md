# Guía rápida del código

La aplicación sigue un recorrido simple para que puedas ubicar cada responsabilidad sin aprender otro framework.

## Inicio de sesión

1. `src/App.jsx` consulta la sesión existente.
2. Sin sesión muestra `AuthScreen.jsx`.
3. `authService` llama a Supabase para registrar o autenticar.
4. Con sesión muestra `Dashboard.jsx` y pasa el usuario actual.

## Lectura de información

1. `Dashboard` ejecuta `financeService.listAll(user.id)`.
2. El servicio consulta movimientos, deudas, pagos y estados de cuenta.
3. Las políticas RLS de `supabase/schema.sql` permiten recibir solamente las filas del usuario autenticado.
4. `calculateSummary()` deriva los totales; los totales no se duplican en la base de datos.

## Crear y editar registros

1. `Dashboard` abre `RecordModal` con un `kind`: `transaction`, `debt`, `payment` o `statement`.
2. El modal transforma el formulario en un objeto usando `FormData`.
3. Las funciones `normalize...` de `finance.js` validan y limpian los valores.
4. Si el objeto ya tiene `id`, el servicio actualiza la fila; si no, crea una nueva.
5. `Dashboard` vuelve a leer los datos y React actualiza la pantalla.

## Eliminar registros

1. El botón **Eliminar** pide confirmación.
2. `financeService` elimina la fila por su `id`.
3. RLS verifica en la base de datos que la fila pertenezca al usuario activo.
4. Los pagos automáticos no se editan desde Movimientos para evitar desincronizar una deuda.

## Pago de una deuda

`register_debt_payment` vive en `supabase/schema.sql` y realiza tres acciones dentro de una sola transacción de PostgreSQL:

1. crea el egreso;
2. guarda el pago en el historial;
3. reduce el saldo y marca la deuda como pagada cuando llega a cero.

Si una acción falla, ninguna de las otras queda guardada a medias.

## Dónde cambiar cada cosa

| Necesidad | Archivo |
| --- | --- |
| Colores y estilos generales | `src/index.css` |
| Pantallas y tablas | `src/components/Dashboard.jsx` |
| Campos de formularios | `src/components/RecordModal.jsx` |
| Reglas de cálculo | `src/finance.js` |
| Consultas a la base | `src/financeService.js` |
| Tablas y seguridad | `supabase/schema.sql` |
