# Webhooks API - DHMEXRACES

Documentación completa del servidor de webhooks desplegado en Vercel.

## Arquitectura

```
dhmexraces-webhooks/
├── api/
│   ├── order-created.js    # Webhook principal de Shopify
│   ├── inventory.js        # API de inventario FOMO
│   ├── dashboard.js        # Dashboard de check-in
│   ├── check-in.js         # Endpoint de check-in
│   └── test.js             # Health check
├── package.json
├── vercel.json
└── README.md
```

## Endpoints

### 1. `POST /api/order-created`

**Webhook principal** que procesa nuevos pedidos de Shopify.

#### Flujo:

1. Shopify envía webhook cuando se crea un pedido
2. Extrae `registration_data` de `note_attributes`
3. Por cada corredor:
   - Genera código QR único (`DHMEX-GTO-XXXXXXXX`)
   - Guarda en Google Sheets
   - Envía email de confirmación con QR

#### Request (desde Shopify):

```json
{
  "id": 5678901234,
  "order_number": 1001,
  "email": "cliente@email.com",
  "created_at": "2026-01-15T10:30:00-06:00",
  "line_items": [
    {
      "title": "Inscripción SEDE 1 - Guanajuato 2026",
      "variant_title": "Elite Hombres",
      "quantity": 1,
      "price": "1500.00"
    }
  ],
  "note_attributes": [
    {
      "name": "registration_data",
      "value": "{\"registrations\":[{\"nombre\":\"Juan Pérez\",\"email\":\"juan@email.com\",\"telefono\":\"5512345678\",\"fecha_nacimiento\":\"1990-05-15\",\"equipo\":\"Team Scott\",\"emergencia_nombre\":\"María López\",\"emergencia_telefono\":\"5587654321\",\"variant_id\":\"123456\",\"variant_title\":\"Elite Hombres\",\"product_title\":\"Inscripción SEDE 1 - Guanajuato 2026\",\"categoria\":\"Elite Hombres\"}],\"timestamp\":\"2026-01-15T10:30:00.000Z\"}"
    }
  ]
}
```

#### Response:

```json
{
  "success": true,
  "orderNumber": "1001",
  "totalRunners": 1,
  "emailsSent": 1,
  "savedToSheets": 1,
  "emailResults": [
    {
      "nombre": "Juan Pérez",
      "email": "juan@email.com",
      "status": "sent",
      "id": "re_abc123..."
    }
  ],
  "sheetsResults": [
    {
      "nombre": "Juan Pérez",
      "checkInCode": "DHMEX-GTO-AB12CD34",
      "success": true,
      "sheet": "GUANAJUATO"
    }
  ]
}
```

#### Código QR Generado:

El código tiene el formato: `DHMEX-{SEDE}-{8_CHARS}`

- `DHMEX`: Prefijo fijo
- `SEDE`: Código de 3 letras (GTO, PUE, GDL, IXT, TAX)
- `8_CHARS`: Alfanumérico aleatorio (sin I, O, 0, 1)

Ejemplo: `DHMEX-GTO-AB12CD34`

---

### 2. `GET /api/inventory`

Retorna disponibilidad de playeras y medallas por sede.

#### Parámetros:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `sede` | string | (Opcional) guanajuato, puebla, guadalajara, ixtapan, taxco |

#### Request:

```bash
# Todas las sedes
curl https://dhmexraces-webhooks.vercel.app/api/inventory

# Una sede específica
curl https://dhmexraces-webhooks.vercel.app/api/inventory?sede=guanajuato
```

#### Response (sede específica):

```json
{
  "success": true,
  "sede": "GUANAJUATO",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "inscritos": 27,
  "playeras": {
    "total": 50,
    "entregadas": 27,
    "disponibles": 23,
    "agotadas": false
  },
  "medallas": {
    "total": 100,
    "entregadas": 27,
    "disponibles": 73,
    "agotadas": false
  }
}
```

#### Response (todas las sedes):

```json
{
  "success": true,
  "timestamp": "2026-01-15T10:30:00.000Z",
  "limits": {
    "playeras": 50,
    "medallas": 100
  },
  "totalInscritos": 135,
  "sedes": {
    "guanajuato": {
      "inscritos": 27,
      "playeras": { "total": 50, "disponibles": 23, "agotadas": false },
      "medallas": { "total": 100, "disponibles": 73, "agotadas": false }
    },
    "puebla": { ... },
    "guadalajara": { ... },
    "ixtapan": { ... },
    "taxco": { ... }
  }
}
```

#### Cache:

```
Cache-Control: s-maxage=60, stale-while-revalidate=30
```

La respuesta se cachea por 60 segundos.

---

### 3. `GET /api/dashboard`

Estadísticas de check-in para el staff del evento.

#### Parámetros:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `sede` | string | (Opcional) Filtrar por sede |
| `runners` | boolean | (Opcional) Incluir lista de corredores (default: true) |

#### Request:

```bash
# Dashboard completo
curl https://dhmexraces-webhooks.vercel.app/api/dashboard

# Solo Guanajuato
curl https://dhmexraces-webhooks.vercel.app/api/dashboard?sede=guanajuato

# Solo estadísticas (sin lista)
curl https://dhmexraces-webhooks.vercel.app/api/dashboard?runners=false
```

#### Response:

```json
{
  "success": true,
  "timestamp": "2026-01-15T10:30:00.000Z",
  "summary": {
    "totalRegistered": 135,
    "totalCheckedIn": 89,
    "pending": 46,
    "percentage": 66
  },
  "bySede": {
    "GUANAJUATO": {
      "registered": 45,
      "checkedIn": 32,
      "percentage": 71
    },
    "PUEBLA": { ... }
  },
  "byCategoria": {
    "Elite Hombres": {
      "registered": 15,
      "checkedIn": 12
    },
    "Elite Mujeres": { ... }
  },
  "runners": [
    {
      "nombre": "Juan Pérez",
      "email": "juan@email.com",
      "equipo": "Team Scott",
      "categoria": "Elite Hombres",
      "sede": "GUANAJUATO",
      "orden": "1001",
      "qrCode": "DHMEX-GTO-AB12CD34",
      "checkedIn": true,
      "checkInTime": "15/01/2026, 08:30:45"
    }
  ]
}
```

---

### 4. `POST /api/check-in`

Marca a un corredor como presente (check-in).

#### Parámetros:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `code` | string | Código QR del corredor |

#### Request:

```bash
# Por POST body
curl -X POST https://dhmexraces-webhooks.vercel.app/api/check-in \
  -H "Content-Type: application/json" \
  -d '{"code": "DHMEX-GTO-AB12CD34"}'

# Por query param
curl -X POST "https://dhmexraces-webhooks.vercel.app/api/check-in?code=DHMEX-GTO-AB12CD34"
```

#### Response (check-in exitoso):

```json
{
  "success": true,
  "alreadyCheckedIn": false,
  "message": "¡Check-in exitoso!",
  "runner": {
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "telefono": "5512345678",
    "equipo": "Team Scott",
    "categoria": "Elite Hombres",
    "sede": "Inscripción SEDE 1 - Guanajuato 2026",
    "orden": "1001",
    "qrCode": "DHMEX-GTO-AB12CD34",
    "checkIn": "SI",
    "checkInTime": "15/01/2026, 08:30:45"
  },
  "sede": "GUANAJUATO",
  "checkInTime": "15/01/2026, 08:30:45"
}
```

#### Response (ya registrado):

```json
{
  "success": true,
  "alreadyCheckedIn": true,
  "message": "Este corredor ya hizo check-in anteriormente",
  "runner": { ... },
  "sede": "GUANAJUATO",
  "checkInTime": "15/01/2026, 08:30:45"
}
```

#### Response (código no encontrado):

```json
{
  "success": false,
  "error": "Código no encontrado",
  "message": "Este código QR no está registrado en el sistema",
  "code": "DHMEX-GTO-INVALID"
}
```

---

### 5. `GET /api/test`

Health check del servidor.

#### Response:

```json
{
  "status": "ok",
  "message": "DHMEXRACES Webhook Server is running",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "endpoints": {
    "orderCreated": "/api/order-created",
    "test": "/api/test"
  }
}
```

---

## Email de Confirmación

El webhook envía un email HTML profesional que incluye:

1. **Header** con logo oficial DHMEXRACES
2. **Mensaje de bienvenida** personalizado
3. **Card con datos**:
   - Badge de categoría
   - Sede del evento
   - Datos del corredor
   - Número de confirmación
4. **Código QR de check-in**
5. **Lista de beneficios** incluidos
6. **Sección Shimano** (mecánica neutral)
7. **Equipo obligatorio** (casco, guantes, rodilleras)
8. **CTA a Instagram**
9. **Footer con patrocinadores**

### Colores del Email:

- **Primario**: `#E42C2C` (Rojo DHMEXRACES)
- **Secundario**: `#0066B3` (Azul Shimano)
- **Fondo**: `#000000` (Negro)
- **Texto**: `#FFFFFF` (Blanco)

---

## Configuración

### Variables de Entorno (Vercel)

```bash
# API de Resend para emails
vercel env add RESEND_API_KEY
# Valor: re_xxxxxxxxx

# Cuenta de servicio de Google
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
# Valor: dhmexraces@proyecto.iam.gserviceaccount.com

vercel env add GOOGLE_PRIVATE_KEY
# Valor: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### Google Sheets

ID del Spreadsheet: `1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg`

Estructura de cada hoja (GUANAJUATO, PUEBLA, etc.):

| Columna | Descripción |
|---------|-------------|
| FECHA | Fecha de inscripción |
| ORDEN | Número de orden Shopify |
| NOMBRE | Nombre completo |
| EMAIL | Correo electrónico |
| TELEFONO | Teléfono |
| FECHA DE NACIMIENTO | Fecha de nacimiento |
| EQUIPO | Nombre del equipo |
| CATEGORIA | Categoría de inscripción |
| SEDE | Nombre del producto |
| EMERGENCIA NOMBRE | Contacto de emergencia |
| EMERGENCIA TEL | Teléfono de emergencia |
| QR_CODE | Código único de check-in |
| CHECK_IN | SI/NO |
| CHECK_IN_TIME | Fecha y hora del check-in |

---

## Deployment

### Desarrollo local:

```bash
cd dhmexraces-webhooks
npm install
vercel dev
```

### Deploy a producción:

```bash
vercel --prod
```

### Configurar webhook en Shopify:

1. **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. Click **Create webhook**
3. Configurar:
   - **Event**: Order creation
   - **Format**: JSON
   - **URL**: `https://dhmexraces-webhooks.vercel.app/api/order-created`
4. Guardar

---

## CORS

Todos los endpoints permiten CORS desde cualquier origen:

```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

---

## Logs

Ver logs en tiempo real:

```bash
vercel logs --follow
```

O en el dashboard de Vercel:
**Dashboard** → **Project** → **Functions** → **Logs**

---

## Troubleshooting

### Webhook no se ejecuta

1. Verificar URL en Shopify
2. Verificar que el endpoint responda a POST
3. Revisar logs de Vercel

### Email no se envía

1. Verificar `RESEND_API_KEY`
2. Verificar que el corredor tenga email
3. Revisar dominio verificado en Resend

### No guarda en Google Sheets

1. Verificar `GOOGLE_SERVICE_ACCOUNT_EMAIL`
2. Verificar `GOOGLE_PRIVATE_KEY` (escapar `\n`)
3. Verificar que la cuenta tenga acceso al spreadsheet
4. Verificar que la hoja exista

### Check-in falla

1. Verificar formato del código QR
2. Verificar que el código exista en alguna hoja
3. Revisar conexión a Google Sheets
