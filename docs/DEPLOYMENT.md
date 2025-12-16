# Deployment Guide - DHMEXRACES

Guía completa paso a paso para desplegar y configurar todo el sistema DHMEXRACES desde cero.

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Prerrequisitos](#prerrequisitos)
3. [Parte 1: Tema de Shopify](#parte-1-tema-de-shopify)
4. [Parte 2: Servidor de Webhooks (Vercel)](#parte-2-servidor-de-webhooks-vercel)
5. [Parte 3: Google Sheets (Base de Datos)](#parte-3-google-sheets-base-de-datos)
6. [Parte 4: Resend (Emails)](#parte-4-resend-emails)
7. [Parte 5: Configurar Webhook en Shopify](#parte-5-configurar-webhook-en-shopify)
8. [Parte 6: Crear Productos de Inscripción](#parte-6-crear-productos-de-inscripción)
9. [Verificación Final](#verificación-final)
10. [Monitoreo](#monitoreo)
11. [Actualizar Sistema](#actualizar-sistema)
12. [Troubleshooting Completo](#troubleshooting-completo)

---

## Visión General

### Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FLUJO DE INSCRIPCIÓN                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. USUARIO                                                             │
│      │                                                                   │
│      ▼                                                                   │
│   ┌─────────────────┐                                                    │
│   │   SHOPIFY       │ ◄── Tema Custom (sections/product.liquid)          │
│   │   (Tienda)      │ ◄── Precios dinámicos (metafields)                 │
│   │                 │ ◄── FOMO badges (API inventory)                    │
│   └────────┬────────┘                                                    │
│            │ Pago completado → Webhook orders/create                     │
│            ▼                                                             │
│   ┌─────────────────┐                                                    │
│   │   VERCEL        │ ◄── /api/order-created                             │
│   │   (Webhooks)    │ ◄── /api/inventory                                 │
│   │                 │ ◄── /api/check-in                                  │
│   └────────┬────────┘                                                    │
│            │                                                             │
│      ┌─────┴─────┐                                                       │
│      │           │                                                       │
│      ▼           ▼                                                       │
│   ┌──────────┐  ┌──────────┐                                             │
│   │ GOOGLE   │  │  RESEND  │                                             │
│   │ SHEETS   │  │ (Email)  │                                             │
│   └──────────┘  └──────────┘                                             │
│                                                                          │
│   2. DÍA DEL EVENTO                                                      │
│      │                                                                   │
│      ▼                                                                   │
│   ┌─────────────────┐                                                    │
│   │   STAFF APP     │ ◄── Escanea QR                                     │
│   │   (Check-in)    │ ◄── /api/check-in                                  │
│   └────────┬────────┘                                                    │
│            │                                                             │
│            ▼                                                             │
│   ┌─────────────────┐                                                    │
│   │  GOOGLE SHEETS  │ ◄── CHECK_IN = "SI"                                │
│   │  (Actualizado)  │ ◄── CHECK_IN_TIME = "15/01/2026, 08:30:45"         │
│   └─────────────────┘                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Servicios Utilizados

| Servicio | Uso | Costo |
|----------|-----|-------|
| **Shopify** | Tienda, pagos, productos | Desde $29 USD/mes |
| **Vercel** | Hosting de APIs/webhooks | Gratis (Hobby) |
| **Google Sheets** | Base de datos | Gratis |
| **Resend** | Envío de emails | Gratis hasta 3k/mes |
| **GitHub** | Repositorio de código | Gratis |

---

## Prerrequisitos

### Software Necesario

| Software | Versión | Instalación |
|----------|---------|-------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com) |
| **Shopify CLI** | 3.50+ | `npm install -g @shopify/cli` |
| **Vercel CLI** | 32+ | `npm install -g vercel` |

### Verificar instalación

```bash
node --version     # v18.0.0+
git --version      # git version 2.30+
shopify version    # @shopify/cli/3.50+
vercel --version   # Vercel CLI 32+
```

### Cuentas Necesarias

| Cuenta | URL | Propósito |
|--------|-----|-----------|
| **Shopify Partner** | [partners.shopify.com](https://partners.shopify.com) | Desarrollo de tema |
| **Vercel** | [vercel.com](https://vercel.com) | Hosting de APIs |
| **Google Cloud** | [console.cloud.google.com](https://console.cloud.google.com) | Sheets API |
| **Resend** | [resend.com](https://resend.com) | Envío de emails |
| **GitHub** | [github.com](https://github.com) | Repositorio |

---

## Parte 1: Tema de Shopify

### 1.1. Clonar repositorio

```bash
git clone https://github.com/PRAZIS-TECHNOLOGIES/DHMEXRACES-SHOPIFY.git
cd DHMEXRACES-SHOPIFY
```

### 1.2. Estructura del repositorio

```
DHMEXRACES-SHOPIFY/
├── dhmexraces-custom/      # Tema de Shopify
├── dhmexraces-webhooks/    # Servidor de webhooks
├── docs/                   # Documentación
└── README.md
```

### 1.3. Conectar con tienda Shopify

```bash
cd dhmexraces-custom
shopify theme dev --store TU-TIENDA.myshopify.com
```

Se abrirá el navegador para autenticación. Autoriza el acceso.

### 1.4. Servidor de desarrollo

El servidor de desarrollo se inicia en `http://127.0.0.1:9292`.

Los cambios se sincronizan automáticamente con la tienda.

### 1.5. Publicar tema

```bash
# Push a tema de desarrollo (para pruebas)
shopify theme push

# Push directo a producción (live)
shopify theme push --live --allow-live
```

### 1.6. Push solo archivos específicos

```bash
# Solo una sección
shopify theme push --only sections/product.liquid --live --allow-live

# Varios archivos
shopify theme push --only sections/product.liquid,sections/header.liquid --live --allow-live

# Solo assets
shopify theme push --only assets/critical.css --live --allow-live
```

---

## Parte 2: Servidor de Webhooks (Vercel)

### 2.1. Instalar dependencias

```bash
cd dhmexraces-webhooks
npm install
```

### 2.2. Login en Vercel

```bash
vercel login
```

### 2.3. Crear proyecto en Vercel

```bash
vercel
```

Responder a las preguntas:
- Set up and deploy? **Y**
- Which scope? **Tu usuario**
- Link to existing project? **N**
- Project name? **dhmexraces-webhooks**
- Directory? **./**
- Want to modify settings? **N**

### 2.4. Configurar variables de entorno

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

```bash
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
# Pegar: tu-cuenta@proyecto.iam.gserviceaccount.com

vercel env add GOOGLE_PRIVATE_KEY
# Pegar: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

**Importante**: La private key debe tener `\n` literales, no saltos de línea reales.

### 2.5. Deploy local (desarrollo)

```bash
vercel dev
```

El servidor corre en `http://localhost:3000`.

Probar:
```bash
curl http://localhost:3000/api/test
```

### 2.6. Deploy a producción

```bash
vercel --prod
```

Anota la URL generada: `https://dhmexraces-webhooks.vercel.app`

---

## Parte 3: Google Sheets (Base de Datos)

### 3.1. Crear spreadsheet

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crear nuevo spreadsheet
3. Nombrarlo: `DHMEXRACES 2026`

### 3.2. Crear hojas por sede

Renombrar `Sheet1` a `GUANAJUATO` y crear hojas adicionales:
- `PUEBLA`
- `GUADALAJARA`
- `IXTAPAN`
- `TAXCO`

### 3.3. Agregar encabezados

En la fila 1 de **cada hoja**:

```
A1: FECHA
B1: ORDEN
C1: NOMBRE
D1: EMAIL
E1: TELEFONO
F1: FECHA DE NACIMIENTO
G1: EQUIPO
H1: CATEGORIA
I1: SEDE
J1: EMERGENCIA NOMBRE
K1: EMERGENCIA TEL
L1: QR_CODE
M1: CHECK_IN
N1: CHECK_IN_TIME
```

### 3.4. Formatear encabezados

1. Seleccionar fila 1
2. **Format** → **Bold**
3. **Format** → **Fill color** → Gris claro
4. **View** → **Freeze** → **1 row**

### 3.5. Crear proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crear nuevo proyecto: `DHMEXRACES`
3. Seleccionar el proyecto

### 3.6. Habilitar Google Sheets API

1. **APIs & Services** → **Library**
2. Buscar "Google Sheets API"
3. Click **Enable**

### 3.7. Crear cuenta de servicio

1. **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service account**
3. Nombre: `dhmexraces-sheets`
4. Click **Create and Continue**
5. Rol: **Editor** (o sin rol)
6. Click **Done**

### 3.8. Generar clave privada

1. Click en la cuenta de servicio creada
2. Tab **Keys** → **Add Key** → **Create new key**
3. Tipo: **JSON**
4. Descargar el archivo JSON

### 3.9. Extraer credenciales

Del archivo JSON descargado:

```json
{
  "client_email": "dhmexraces@proyecto.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

### 3.10. Compartir spreadsheet con cuenta de servicio

1. Abrir spreadsheet en Google Sheets
2. Click **Share**
3. Agregar el email de la cuenta de servicio:
   ```
   dhmexraces@proyecto.iam.gserviceaccount.com
   ```
4. Permiso: **Editor**
5. Click **Share**

### 3.11. Actualizar ID en código

En `dhmexraces-webhooks/api/*.js`, verificar:

```javascript
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID';
```

El ID está en la URL del spreadsheet:
```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
```

---

## Parte 4: Resend (Emails)

### 4.1. Crear cuenta

1. Ve a [resend.com](https://resend.com)
2. Registrarse con email

### 4.2. Verificar dominio

1. Ve a [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Ingresar: `endhurorace.com` (o tu dominio)
4. Agregar registros DNS:

| Tipo | Nombre | Valor |
|------|--------|-------|
| TXT | @ o resend | `v=spf1 include:amazonses.com ~all` |
| CNAME | resend._domainkey | (proporcionado por Resend) |
| TXT | _dmarc | `v=DMARC1; p=none` |

5. Esperar verificación (puede tomar hasta 48h)

### 4.3. Crear API Key

1. Ve a [resend.com/api-keys](https://resend.com/api-keys)
2. Click **Create API Key**
3. Nombre: `DHMEXRACES Production`
4. Permission: **Full access**
5. Copiar la key (empieza con `re_`)

### 4.4. Actualizar remitente en código

En `api/order-created.js`:

```javascript
from: 'DHMEXRACES <noreply@endhurorace.com>',
```

---

## Parte 5: Configurar Webhook en Shopify

### 5.1. Ir a configuración de webhooks

1. Ve a **Shopify Admin** → **Settings** → **Notifications**
2. Scroll hasta **Webhooks**
3. Click **Create webhook**

### 5.2. Configurar webhook

| Campo | Valor |
|-------|-------|
| **Event** | `Order creation` |
| **Format** | `JSON` |
| **URL** | `https://dhmexraces-webhooks.vercel.app/api/order-created` |
| **API version** | `2024-01` (o la más reciente) |

### 5.3. Guardar y probar

1. Click **Save**
2. Click **Send test notification**
3. Verificar en logs de Vercel:
   ```bash
   vercel logs --follow
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

```
custom.pricing_enabled     = true
custom.phase1_price        = 1200
custom.phase1_label        = "EARLY BIRD"
custom.phase1_end          = 2026-01-15T23:59:00
custom.phase2_price        = 1350
custom.phase2_label        = "PRECIO REGULAR"
custom.phase2_end          = 2026-02-14T23:59:00
custom.phase3_price        = 1500
custom.phase3_label        = "INSCRIPCIÓN TARDÍA"
custom.phase3_end          = 2026-03-05T23:59:00
custom.event_date          = 2026-03-07T08:00:00
custom.event_date_label    = "para Guanajuato 2026"
custom.close_date          = 2026-03-05T23:59:00
```

### 6.4. Asignar template

1. En el producto, sección **Theme template**
2. Seleccionar: `product.inscripcion-guanajuato-2026`

---

## Verificación Final

### Checklist de Verificación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VERIFICACIÓN FINAL                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TEMA SHOPIFY                                                            │
│  ─────────────                                                           │
│  [ ] Tema publicado en la tienda                                         │
│  [ ] Página de producto carga correctamente                              │
│  [ ] Precios dinámicos funcionan según la fecha                          │
│  [ ] FOMO badges muestran playeras/medallas                              │
│  [ ] Countdown al evento visible                                         │
│  [ ] Categorías seleccionables                                           │
│  [ ] Botón de inscripción funciona                                       │
│                                                                          │
│  WEBHOOKS (VERCEL)                                                       │
│  ─────────────────                                                       │
│  [ ] URL accesible: /api/test responde                                   │
│  [ ] Variables de entorno configuradas                                   │
│  [ ] Webhook de Shopify configurado                                      │
│  [ ] Test notification de Shopify exitoso                                │
│                                                                          │
│  GOOGLE SHEETS                                                           │
│  ──────────────                                                          │
│  [ ] Spreadsheet creado con hojas por sede                               │
│  [ ] Cuenta de servicio tiene acceso                                     │
│  [ ] Encabezados en cada hoja                                            │
│  [ ] Conexión probada vía API                                            │
│                                                                          │
│  EMAILS (RESEND)                                                         │
│  ───────────────                                                         │
│  [ ] Dominio verificado                                                  │
│  [ ] API Key creada y configurada                                        │
│  [ ] Email de prueba enviado                                             │
│                                                                          │
│  PRODUCTO                                                                │
│  ────────                                                                │
│  [ ] Producto creado con variantes                                       │
│  [ ] Metafields configurados                                             │
│  [ ] Template asignado                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Prueba Completa (End-to-End)

1. **Ir a página de producto**
   - Verificar que muestre precios dinámicos
   - Verificar FOMO badges

2. **Seleccionar categoría**
   - Verificar que el botón cambie

3. **Completar formulario de prueba**
   - Llenar todos los campos

4. **Agregar al carrito**
   - Verificar que se agregue

5. **Completar checkout**
   - Usar Shopify Payments en modo test
   - Tarjeta de prueba: `4242 4242 4242 4242`

6. **Verificar resultado**
   - [ ] Email recibido con QR
   - [ ] Datos guardados en Google Sheets
   - [ ] Código QR funcional

---

## Monitoreo

### Logs de Vercel

```bash
# Ver logs en tiempo real
vercel logs --follow

# Ver logs de las últimas 24 horas
vercel logs
```

O en dashboard: **Vercel** → **Project** → **Deployments** → **Functions** → **Logs**

### Logs de Shopify

**Settings** → **Notifications** → **Webhooks** → Ver eventos recientes

### Google Sheets

Revisar periódicamente que los datos se estén guardando correctamente:
- Nuevas filas aparecen
- Códigos QR únicos
- Datos completos

### Dashboard de Check-in

```
GET https://dhmexraces-webhooks.vercel.app/api/dashboard
```

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

### Rollback de Vercel

En Vercel Dashboard:
1. Ir a **Deployments**
2. Encontrar deployment anterior
3. Click **...** → **Promote to Production**

### Rollback de tema Shopify

En Shopify Admin:
1. **Online Store** → **Themes**
2. **Actions** → **Duplicate** (hacer backup primero)
3. Restaurar versión anterior si es necesario

---

## Troubleshooting Completo

### Problemas del Tema

#### El tema no carga

```bash
shopify theme dev --verbose
```

**Causas comunes**:
1. Error de sintaxis en Liquid
2. Archivo faltante
3. JSON inválido en templates

**Solución**:
1. Revisar errores en consola
2. Verificar sintaxis Liquid
3. Validar JSON en templates

#### Precios no cambian

**Causas**:
1. `pricing_enabled` no es `true`
2. Fechas mal formateadas
3. JavaScript con errores

**Solución**:
1. Verificar metafield `pricing_enabled`
2. Usar formato ISO 8601: `2026-01-15T23:59:00`
3. Revisar consola del navegador

#### FOMO badges muestran "--"

**Causas**:
1. API no responde
2. Sede no detectada
3. Error de CORS

**Solución**:
1. Probar API directamente:
   ```bash
   curl https://dhmexraces-webhooks.vercel.app/api/inventory?sede=guanajuato
   ```
2. Verificar título del producto contiene nombre de sede
3. Verificar headers CORS en la API

---

### Problemas de Webhooks

#### Webhook no se ejecuta

**Causas**:
1. URL incorrecta en Shopify
2. Endpoint no responde
3. Error en el código

**Solución**:
1. Verificar URL exacta en Shopify Admin
2. Probar endpoint:
   ```bash
   curl -X POST https://dhmexraces-webhooks.vercel.app/api/order-created
   ```
3. Revisar logs de Vercel

#### Webhook timeout

**Causas**:
1. Tiempo de ejecución > 10s (Vercel free)
2. Conexión lenta a Google Sheets
3. Muchas operaciones

**Solución**:
1. Optimizar código
2. Reducir consultas a Sheets
3. Considerar Vercel Pro (60s timeout)

#### Error 500 en webhook

**Causas**:
1. Variables de entorno faltantes
2. Credenciales de Google inválidas
3. Error en el código

**Solución**:
1. Verificar todas las env vars en Vercel
2. Regenerar credenciales de Google
3. Revisar logs detallados

---

### Problemas de Google Sheets

#### "The caller does not have permission"

**Causa**: Cuenta de servicio sin acceso.

**Solución**:
1. Abrir spreadsheet
2. Click **Share**
3. Agregar email de cuenta de servicio como **Editor**

#### "Hoja no encontrada"

**Causa**: Nombre de hoja incorrecto.

**Solución**:
1. Verificar nombre exacto (MAYÚSCULAS)
2. Nombres válidos: `GUANAJUATO`, `PUEBLA`, `GUADALAJARA`, `IXTAPAN`, `TAXCO`

#### "Invalid grant"

**Causa**: Private key mal formateada.

**Solución**:
1. Los `\n` deben ser literales, no saltos reales
2. Regenerar la clave si es necesario
3. Actualizar en Vercel

#### Filas duplicadas

**Causa**: Webhook se ejecutó dos veces.

**Solución**:
1. Agregar validación de orden existente:
   ```javascript
   const existing = rows.find(r => r.ORDEN === orderNumber);
   if (existing) return;
   ```
2. Usar idempotency en Shopify

---

### Problemas de Emails

#### Emails no llegan

**Causas**:
1. API key inválida
2. Dominio no verificado
3. Email en spam

**Solución**:
1. Verificar `RESEND_API_KEY` en Vercel
2. Verificar dominio en Resend dashboard
3. Revisar carpeta de spam

#### Email llega sin QR

**Causa**: Error generando URL del QR.

**Solución**:
1. Verificar que `checkInCode` se genere
2. Verificar URL del QR API
3. Revisar logs

#### Error "From address not verified"

**Causa**: Dominio no verificado en Resend.

**Solución**:
1. Verificar dominio en Resend
2. O usar email temporal de Resend: `onboarding@resend.dev`

---

### Problemas de Check-in

#### Código QR no funciona

**Causas**:
1. Código no existe en Sheets
2. Formato incorrecto
3. Error de conexión

**Solución**:
1. Verificar que el código exista en Google Sheets
2. Formato correcto: `DHMEX-GTO-XXXXXXXX`
3. Probar conexión a Sheets

#### Check-in duplicado

El sistema ya maneja esto - retorna `alreadyCheckedIn: true`.

#### Dashboard no carga datos

**Causas**:
1. Error de conexión a Sheets
2. Hojas vacías
3. Error en código

**Solución**:
1. Verificar credenciales
2. Agregar al menos un registro de prueba
3. Revisar logs

---

### Comandos Útiles de Debug

```bash
# Verificar estado del servidor
curl https://dhmexraces-webhooks.vercel.app/api/test

# Probar inventario
curl https://dhmexraces-webhooks.vercel.app/api/inventory?sede=guanajuato

# Ver logs en tiempo real
vercel logs --follow

# Ver variables de entorno
vercel env ls

# Redeploy
vercel --prod --force

# Ver estado del tema
shopify theme info

# Verificar tema localmente
shopify theme dev --verbose
```

---

## Contacto y Soporte

### Documentación Adicional

- [SHOPIFY-THEME.md](./SHOPIFY-THEME.md) - Detalles del tema
- [WEBHOOKS-API.md](./WEBHOOKS-API.md) - Detalles de la API
- [METAFIELDS.md](./METAFIELDS.md) - Configuración de metafields
- [GOOGLE-SHEETS.md](./GOOGLE-SHEETS.md) - Base de datos

### Repositorio

```
https://github.com/PRAZIS-TECHNOLOGIES/DHMEXRACES-SHOPIFY
```
