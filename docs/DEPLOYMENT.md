# Deployment Guide - DHMEXRACES

Guía paso a paso para desplegar y configurar todo el sistema DHMEXRACES.

## Prerrequisitos

### Software necesario

- **Node.js 18+**: [nodejs.org](https://nodejs.org)
- **Git**: [git-scm.com](https://git-scm.com)
- **Shopify CLI**: `npm install -g @shopify/cli`
- **Vercel CLI**: `npm install -g vercel`

### Cuentas necesarias

- **Shopify Partner** o tienda con acceso de desarrollo
- **Vercel** (gratis): [vercel.com](https://vercel.com)
- **Google Cloud** (gratis): [console.cloud.google.com](https://console.cloud.google.com)
- **Resend** (gratis hasta 3k emails/mes): [resend.com](https://resend.com)

---

## Parte 1: Tema de Shopify

### 1.1. Clonar repositorio

```bash
git clone https://github.com/Gibrangomz/DHMEXRACES-SHOPIFY.git
cd DHMEXRACES-SHOPIFY
```

### 1.2. Conectar con tienda Shopify

```bash
cd dhmexraces-custom
shopify theme dev --store TU-TIENDA.myshopify.com
```

Se abrirá el navegador para autenticación. Autoriza el acceso.

### 1.3. Desarrollo local

El servidor de desarrollo se inicia en `http://127.0.0.1:9292`.

Los cambios se sincronizan automáticamente.

### 1.4. Publicar tema

```bash
# Push a tema de desarrollo
shopify theme push

# Push directo a producción (live)
shopify theme push --live --allow-live
```

### 1.5. Push solo archivos específicos

```bash
# Solo una sección
shopify theme push --only sections/product.liquid --live --allow-live

# Varios archivos
shopify theme push --only sections/product.liquid,sections/header.liquid --live --allow-live
```

---

## Parte 2: Servidor de Webhooks (Vercel)

### 2.1. Instalar dependencias

```bash
cd ../dhmexraces-webhooks
npm install
```

### 2.2. Configurar variables de entorno

#### Resend API Key

1. Ve a [resend.com/api-keys](https://resend.com/api-keys)
2. Crear nueva API Key
3. Copiar la key

```bash
vercel env add RESEND_API_KEY
# Pegar: re_xxxxxxxxx
# Seleccionar: Production, Preview, Development
```

#### Google Service Account

1. Descargar JSON de cuenta de servicio (ver [GOOGLE-SHEETS.md](./GOOGLE-SHEETS.md))
2. Extraer valores:

```bash
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
# Pegar: tu-cuenta@proyecto.iam.gserviceaccount.com

vercel env add GOOGLE_PRIVATE_KEY
# Pegar: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

**Importante**: La private key debe tener `\n` literales, no saltos de línea reales.

### 2.3. Deploy local (desarrollo)

```bash
vercel dev
```

El servidor corre en `http://localhost:3000`.

Probar:
```bash
curl http://localhost:3000/api/test
```

### 2.4. Deploy a producción

```bash
vercel --prod
```

Anota la URL generada: `https://tu-proyecto.vercel.app`

---

## Parte 3: Configurar Webhook en Shopify

### 3.1. Crear webhook

1. Ve a **Shopify Admin** → **Settings** → **Notifications**
2. Scroll hasta **Webhooks**
3. Click **Create webhook**

### 3.2. Configurar webhook

| Campo | Valor |
|-------|-------|
| Event | `Order creation` |
| Format | `JSON` |
| URL | `https://tu-proyecto.vercel.app/api/order-created` |
| API version | `2024-01` (o la más reciente) |

### 3.3. Guardar y probar

1. Click **Save**
2. Click **Send test notification**
3. Verificar en logs de Vercel

---

## Parte 4: Configurar Google Sheets

### 4.1. Crear spreadsheet

Ver [GOOGLE-SHEETS.md](./GOOGLE-SHEETS.md) para instrucciones detalladas.

### 4.2. Compartir con cuenta de servicio

1. Abrir spreadsheet
2. Click **Share**
3. Agregar email de cuenta de servicio como **Editor**

### 4.3. Actualizar ID en código

En `dhmexraces-webhooks/api/*.js`, actualizar:

```javascript
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID';
```

### 4.4. Re-deploy

```bash
vercel --prod
```

---

## Parte 5: Configurar Resend (Emails)

### 5.1. Verificar dominio

1. Ve a [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Ingresar: `endhurorace.com` (o tu dominio)
4. Agregar registros DNS:
   - **SPF**: `v=spf1 include:amazonses.com ~all`
   - **DKIM**: (proporcionado por Resend)
   - **DMARC**: `v=DMARC1; p=none`
5. Esperar verificación (puede tomar hasta 48h)

### 5.2. Actualizar remitente en código

En `api/order-created.js`:

```javascript
from: 'DHMEXRACES <noreply@endhurorace.com>',
```

---

## Parte 6: Crear Productos de Inscripción

### 6.1. Crear producto en Shopify

1. **Products** → **Add product**
2. Título: `Inscripción SEDE 1 - Guanajuato 2026`
3. Descripción: Información del evento
4. Precio: Precio base (se sobreescribe con metafields)

### 6.2. Agregar variantes (categorías)

En la sección **Variants**:

| Variante | Precio |
|----------|--------|
| Elite Hombres | $1500 |
| Elite Mujeres | $1500 |
| Master 30+ Hombres | $1500 |
| Master 30+ Mujeres | $1500 |
| Veteranos 40+ | $1500 |
| Amateur Hombres | $1500 |
| Amateur Mujeres | $1500 |
| Juvenil 14-17 | $1200 |
| Infantil 10-13 | $1000 |
| Open Hardtail | $1500 |

### 6.3. Configurar metafields

Ver [METAFIELDS.md](./METAFIELDS.md) para configurar:

- `custom.pricing_enabled`: `true`
- `custom.phase1_price`: `1200`
- `custom.phase1_label`: `EARLY BIRD`
- `custom.phase1_end`: `2026-01-15T23:59:00`
- ... (demás fases)

### 6.4. Asignar template

1. En el producto, sección **Theme template**
2. Seleccionar: `product.inscripcion-guanajuato-2026`

---

## Verificación Final

### Checklist

- [ ] Tema publicado y funcionando
- [ ] Webhooks respondiendo en Vercel
- [ ] Webhook configurado en Shopify
- [ ] Google Sheets accesible por cuenta de servicio
- [ ] Dominio verificado en Resend
- [ ] Producto de inscripción creado
- [ ] Metafields configurados
- [ ] Template asignado

### Prueba completa

1. Ir a página de producto
2. Verificar que muestre precios dinámicos
3. Verificar FOMO badges
4. Completar formulario de prueba
5. Agregar al carrito
6. Completar checkout (usar Shopify Payments en modo test)
7. Verificar:
   - Email recibido con QR
   - Datos guardados en Google Sheets
   - Código QR funcional

---

## Monitoreo

### Logs de Vercel

```bash
vercel logs --follow
```

O en dashboard: **Vercel** → **Project** → **Deployments** → **Functions** → **Logs**

### Logs de Shopify

**Settings** → **Notifications** → **Webhooks** → Ver eventos recientes

### Google Sheets

Revisar periódicamente que los datos se estén guardando correctamente.

---

## Troubleshooting

### El tema no carga

```bash
shopify theme dev --verbose
```

### Webhook timeout

Los webhooks de Vercel tienen límite de 10s (free) o 60s (pro).
Optimizar código o usar background jobs.

### Emails no llegan

1. Verificar dominio en Resend
2. Revisar spam
3. Verificar logs de Vercel
4. Verificar API key

### Datos no se guardan

1. Verificar credenciales de Google
2. Verificar que la hoja exista
3. Verificar permisos de cuenta de servicio

---

## Actualizar Sistema

### Actualizar tema

```bash
cd dhmexraces-custom
git pull origin main
shopify theme push --live --allow-live
```

### Actualizar webhooks

```bash
cd dhmexraces-webhooks
git pull origin main
vercel --prod
```

### Rollback

En Vercel Dashboard, ir a **Deployments** y hacer rollback a versión anterior.
