# Gestor Documental DAN

## Acceso y módulo de envíos

El gestor requiere una sesión de Supabase Auth. En **Authentication → Settings**, desactiva **Allow new users to sign up**; luego crea las cuentas autorizadas desde **Authentication → Users**. Todos los usuarios habilitados comparten acceso a los registros del gestor.

Antes de publicar esta versión:

1. En **Project Settings → API Keys** de Supabase, copia la clave pública `anon` (o `publishable`) y colócala como `SUPABASE_KEY` en `js/config.js`. No pongas allí la contraseña de ningún usuario.
2. Ejecuta `supabase/migrations/202610190001_coordinadora_shipments.sql` en el SQL Editor del proyecto Supabase. La migración crea el módulo de envíos y el historial de ruta, y limita el acceso a los datos del gestor a usuarios autenticados.
3. En **Authentication → Settings**, desactiva el registro público; en **Authentication → Providers**, habilita Email y crea las cuentas autorizadas.
4. Inicia sesión y programa envíos desde **Envíos**. Mientras la API no esté conectada, la guía y las novedades de ruta se registran manualmente.

Si el inicio de sesión rechaza las credenciales, comprueba que el usuario aparezca en **Authentication → Users** del mismo proyecto Supabase configurado en `js/config.js` y que el correo esté confirmado. Si hace falta, restablece la contraseña desde el panel de administración. Un error `invalid_credentials` no permite distinguir entre contraseña incorrecta y cuenta creada en otro proyecto.

## Destrucción documental

Ejecuta `supabase/migrations/202610280001_destruccion_documental.sql` en el SQL Editor. Crea la tabla del historial de destrucción y la función `enviar_caja_a_destruccion`, que mueve una caja de Documentación general al historial en una sola transacción: si algo falla, la caja no se elimina.

## API de Coordinadora

La aplicación no llama a Coordinadora directamente ni guarda credenciales del transportador en el navegador. Para habilitar la creación de guías y el rastreo automático se requiere la documentación oficial del servicio contratado (autenticación, ambientes y operaciones disponibles). La integración debe ejecutarse en una función de servidor —por ejemplo, Supabase Edge Function— con las credenciales almacenadas como secretos del servidor.
