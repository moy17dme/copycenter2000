# Supabase + verificacion en 2 pasos

Este proyecto ya tiene flujo de 2FA con `TOTP` en el frontend.

## Lo importante

- La verificacion en 2 pasos que ya usa la app es con una app autenticadora tipo Google Authenticator, Authy o 1Password.
- Ese flujo no necesita Twilio.
- Twilio en Supabase se usa para `Phone Auth` por SMS o WhatsApp OTP, no para el TOTP que ya esta implementado aqui.

## Si quieres dejar lista la app hoy

1. Entra a Supabase Dashboard.
2. Ve a `Authentication > Providers`.
3. Activa `Email`.
4. Ve a `Authentication > Multi-Factor Auth`.
5. Activa `TOTP`.
6. En `Authentication > URL Configuration` agrega:
   - `Site URL`: la URL real de tu sitio.
   - `Redirect URL`: `http://localhost:5173/auth/callback`
   - `Redirect URL`: tu dominio de produccion seguido de `/auth/callback`
7. Ejecuta el SQL de [SUPABASE_SQL.sql](E:\react copy\copycenter2000\SUPABASE_SQL.sql) si aun no lo hiciste.

## Si de todos modos quieres conectar Twilio

Supabase normalmente te pedira estos datos de Twilio:

- `Account SID`
- `Auth Token`
- `Messaging Service SID`
- En algunos casos, un numero o sender aprobado dentro de Twilio

Esos datos no salen de Supabase ni del repo. Se obtienen en Twilio Console:

1. `Console Dashboard`:
   - `Account SID`
   - `Auth Token`
2. `Messaging > Services`:
   - crea un `Messaging Service`
   - copia el `Messaging Service SID`
3. Agrega un numero o canal aprobado al servicio
4. Vuelve a Supabase y pega esas credenciales en `Authentication > Phone`

## Recomendacion para este proyecto

- Usa `TOTP` para la verificacion en 2 pasos.
- Usa Twilio solo si tambien quieres login por codigo SMS o WhatsApp OTP.
- Si activas Twilio, el frontend de este repo todavia no usa `signInWithOtp`; habria que agregar ese flujo aparte.
