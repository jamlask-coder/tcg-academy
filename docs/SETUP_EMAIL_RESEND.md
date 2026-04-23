# Configurar emails de producción — dominio tcgacademy.es + Resend

Guía end-to-end para que los emails de la tienda (`bienvenida`, `verificar_email`,
`confirmacion_pedido`, `pedido_enviado`, cupones, devoluciones, etc.) salgan
realmente desde `@tcgacademy.es` y **no acaben en spam**.

Tiempo estimado: **30-45 min** (mayormente espera de propagación DNS).

---

## 0) Qué vamos a conseguir

- From: `TCG Academy <hola@tcgacademy.es>`
- Reply-To: `tcgacademycalpe@gmail.com` (buzón real mientras no haya uno en el dominio)
- SPF + DKIM + DMARC configurados → inbox (no spam) en Gmail / Outlook / iCloud.
- **No hace falta crear buzón en `tcgacademy.es`**. Resend sólo envía. Las
  respuestas de clientes llegan al Gmail mediante el header `Reply-To`.

Cuando más adelante tengas buzón corporativo (Google Workspace, Zoho Mail,
etc.), basta con cambiar `RESEND_REPLY_TO` → el resto no se toca.

---

## 1) Registrar el dominio en Resend

1. Crea cuenta en https://resend.com (plan Free sirve: 3.000 emails/mes, 100/día).
2. Dashboard → **Domains** → **Add Domain** → escribe `tcgacademy.es` (sin https://, sin www).
3. Selecciona **Region = EU (Dublin)** — por RGPD, mantiene los logs en Europa.
4. Resend te muestra una lista de **registros DNS** para copiar. Pasa al paso 2.

---

## 2) Añadir registros DNS en tu proveedor

Ve al panel donde gestionas el DNS de `tcgacademy.es` (Cloudflare, IONOS,
Namecheap, GoDaddy, DonDominio, etc.) → sección DNS / Zone Editor / Registros.

Vas a añadir **4 registros**. Los valores exactos (SPF, DKIM) te los da Resend
en el paso anterior — son distintos para cada cuenta.

### 2.1 SPF — autoriza a Resend a enviar por ti

| Tipo | Nombre / Host | Valor                                  | TTL  |
| ---- | ------------- | -------------------------------------- | ---- |
| TXT  | `@` (root)    | `v=spf1 include:amazonses.com ~all`    | Auto |

> Si ya tenías un SPF (por Google Workspace, Mailgun…) **NO añadas un segundo**.
> Un dominio solo puede tener **un TXT SPF**. Fusiona los `include:` en uno:
> `v=spf1 include:_spf.google.com include:amazonses.com ~all`

### 2.2 DKIM — firma criptográfica que demuestra que el email es legítimo

Resend te mostrará **tres** registros CNAME con nombres tipo
`resend._domainkey`, `resend2._domainkey`, `resend3._domainkey`.
**Cópialos tal cual** (los valores cambian según tu cuenta).

| Tipo  | Nombre                      | Valor (ejemplo — usa el TUYO)  | TTL  |
| ----- | --------------------------- | ------------------------------ | ---- |
| CNAME | `resend._domainkey`         | `resend._domainkey.resend.com` | Auto |
| CNAME | `resend2._domainkey`        | `resend2._domainkey.resend.com`| Auto |
| CNAME | `resend3._domainkey`        | `resend3._domainkey.resend.com`| Auto |

> **En Cloudflare**: asegúrate de que el icono naranja 🧡 (proxy) esté **desactivado**
> en estos CNAME → deben ir en "DNS only" (gris). Si no, Cloudflare rompe DKIM.

### 2.3 DMARC — política contra suplantación

Empieza suave (`p=none` solo observa, no rechaza). Ya lo endurecerás cuando
lleve 2-4 semanas funcionando.

| Tipo | Nombre    | Valor                                                                                           | TTL  |
| ---- | --------- | ----------------------------------------------------------------------------------------------- | ---- |
| TXT  | `_dmarc`  | `v=DMARC1; p=none; rua=mailto:tcgacademycalpe@gmail.com; ruf=mailto:tcgacademycalpe@gmail.com; fo=1` | Auto |

> Recibirás **reports diarios XML** en ese gmail con quién intenta enviar emails
> en tu nombre. Útil para detectar phishing. Si te agobian, pon `rua=` vacío.

### 2.4 (Opcional) MX — solo si quieres RECIBIR emails

Por ahora **no lo pongas**. Resend no necesita MX para enviar. Cuando contrates
Google Workspace o Zoho, esa herramienta te dará sus propios MX.

---

## 3) Esperar verificación en Resend

- Resend re-consulta tus DNS cada pocos minutos. Normalmente 5-30 min.
- Puede tardar hasta 48h si tu proveedor DNS es lento (poco habitual).
- Verificar manualmente desde terminal:

```bash
# SPF
dig +short TXT tcgacademy.es
# DKIM (uno de los tres)
dig +short CNAME resend._domainkey.tcgacademy.es
# DMARC
dig +short TXT _dmarc.tcgacademy.es
```

Cuando en Resend Dashboard → Domains → `tcgacademy.es` pone **"Verified"** en
verde, pasa al paso 4.

---

## 4) Crear API key y configurar .env

1. Resend → **API Keys** → **Create API Key** → nombre `tcg-academy-prod`,
   permiso `Sending access` sobre `tcgacademy.es`.
2. Copia la key (empieza por `re_…`) — solo se muestra una vez.
3. En `.env.local` (dev) y en las env vars de tu host (Vercel, Netlify, etc.):

```bash
NEXT_PUBLIC_BACKEND_MODE=server
RESEND_API_KEY=re_tuClaveAqui
RESEND_FROM_EMAIL=hola@tcgacademy.es
RESEND_REPLY_TO=tcgacademycalpe@gmail.com
ADMIN_NOTIFICATION_EMAIL=tcgacademycalpe@gmail.com
```

> En Vercel: Project → Settings → Environment Variables → añadir cada una en
> `Production` (y `Preview` si haces previews con emails reales — cuidado, envía
> de verdad). Redeploy después.

---

## 5) Probar end-to-end

### 5.1 Prueba rápida desde Resend

Dashboard → **Send Test Email** → a tu propio buzón.
Si llega a **inbox** (no spam) y las cabeceras muestran `SPF=pass`, `DKIM=pass`,
`DMARC=pass`, el dominio está sano.

### 5.2 Prueba desde la app

1. `npm run dev`
2. Regístrate con un email real (tuyo — no `@example.com`) en `/registro`.
3. Debes recibir:
   - **bienvenida** (inmediato)
   - **verificar_email** con enlace `tcgacademy.es/verificar-email?token=...&email=...`
4. Haz clic en el enlace → debe aparecer "¡Email verificado!" y en
   Supabase → tabla `users` → tu fila tiene `email_verified = true`.

### 5.3 Diagnóstico si algo no llega

- **Nada en Resend Dashboard → Logs**: problema de red o API key mal.
  Comprueba `RESEND_API_KEY` en tus env vars.
- **Resend lo marca como "bounced"**: revisa que el email destino existe.
- **Llega a spam**: SPF/DKIM/DMARC mal. Usa https://www.mail-tester.com —
  manda un email de prueba a la dirección que te da; te puntúa de 1 a 10 y dice
  qué falla.
- **`domain not verified` al enviar**: aún no terminó de propagar. Espera.

---

## 6) Subir el rigor cuando lleve 2-4 semanas funcionando

Una vez los reports DMARC muestren 0 abusos, endurece la política:

```
v=DMARC1; p=quarantine; pct=25; rua=mailto:tcgacademycalpe@gmail.com; fo=1
```

Luego `p=quarantine; pct=100`, y finalmente `p=reject`. Así nadie podrá
suplantar `@tcgacademy.es`.

---

## 7) Auditorías relevantes

El test suite `node tests/audit/run-audit.mjs` cubre:

- **Test 21** — `logSentEmail()` solo dentro de `emailService.ts` (el antipatrón
  que impedía que los emails salieran de verdad).
- **Test 22** — cada `templateId` referenciado en código existe en la SSOT
  `src/data/emailTemplates.ts` (previene typos que fallan en silencio).
- **Test 23** — `RESEND_API_KEY` (y otros secretos server-only) no aparecen en
  código cliente (previene que alguien intente enviar emails desde el browser,
  donde `process.env.RESEND_API_KEY` siempre es `undefined`).
- **Test 24** — `/api/auth register` envía `verificar_email` server-side y
  `AuthContext` sólo lo envía cliente en modo local.

Ejecutar tras cualquier cambio que toque emails o auth.

---

## Resumen tabla DNS

Copia-pega rápido (sustituye los valores DKIM por los que Resend te dé):

```
Tipo  | Nombre                   | Valor
------+--------------------------+--------------------------------------------------
TXT   | @                        | v=spf1 include:amazonses.com ~all
CNAME | resend._domainkey        | resend._domainkey.resend.com
CNAME | resend2._domainkey       | resend2._domainkey.resend.com
CNAME | resend3._domainkey       | resend3._domainkey.resend.com
TXT   | _dmarc                   | v=DMARC1; p=none; rua=mailto:TU_GMAIL; fo=1
```
