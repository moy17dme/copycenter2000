# Acceso con Google

La aplicacion ya inicia Google OAuth mediante Supabase y procesa el retorno en
`/auth/callback`. El Client Secret nunca debe agregarse al frontend ni usar un
nombre que empiece con `VITE_`.

## 1. Google Auth Platform

En Google Cloud crea un cliente OAuth de tipo **Web application**.

Authorized JavaScript origins:

```text
https://copycenter2000.com
http://localhost:5173
```

Authorized redirect URI de Google:

```text
https://zdebbsyuoqsttqfwvxlg.supabase.co/auth/v1/callback
```

Configura los scopes `openid`, `userinfo.email` y `userinfo.profile`. En la
pantalla de consentimiento usa el nombre Copy Center 2000, su logo y el dominio
`copycenter2000.com`.

## 2. Supabase

En Authentication > Providers > Google:

1. Activa Google.
2. Pega el Client ID y Client Secret creados en Google.
3. Guarda los cambios.

En Authentication > URL Configuration:

```text
Site URL: https://copycenter2000.com
Redirect URL: https://copycenter2000.com/auth/callback
Redirect URL local: http://localhost:5173/auth/callback
```

Usa rutas exactas en produccion. No agregues comodines para
`copycenter2000.com`.

## 3. Verificacion

Al habilitar el proveedor, el boton **Continuar con Google** aparece
automaticamente sin exponer el secreto. Para comprobarlo:

1. Abre una ventana privada.
2. Pulsa Ingresar y luego Continuar con Google.
3. Autoriza una cuenta de prueba.
4. Confirma que regresa a Copy Center 2000 y muestra la cuenta iniciada.
5. Agrega un producto y verifica que el acceso desde el pago restaura el
   carrito.
