# Webhooks API - DHMEXRACES

Documentación técnica completa del servidor de webhooks desplegado en Vercel para procesar inscripciones.

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Endpoints](#endpoints)
   - [POST /api/order-created](#1-post-apiorder-created)
   - [GET /api/inventory](#2-get-apiinventory)
   - [GET /api/dashboard](#3-get-apidashboard)
   - [POST /api/check-in](#4-post-apicheck-in)
   - [GET /api/test](#5-get-apitest)
4. [Código Fuente Completo](#código-fuente-completo)
5. [Formato del Código QR](#formato-del-código-qr)
6. [Email de Confirmación](#email-de-confirmación)
7. [Configuración de Vercel](#configuración-de-vercel)
8. [Variables de Entorno](#variables-de-entorno)
9. [CORS y Headers](#cors-y-headers)
10. [Logs y Monitoreo](#logs-y-monitoreo)
11. [Troubleshooting](#troubleshooting)

---

## Visión General

El servidor de webhooks es un conjunto de **funciones serverless** desplegadas en **Vercel** que procesan:

1. **Webhooks de Shopify**: Cuando se crea un pedido, procesa los datos de inscripción
2. **API de Inventario**: Proporciona datos en tiempo real para los badges FOMO
3. **Dashboard de Staff**: Estadísticas de check-in para el día del evento
4. **Sistema de Check-in**: Escanea QR y marca corredores como presentes

### Tecnologías

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Node.js** | 18+ | Runtime |
| **Vercel** | Serverless | Hosting |
| **google-spreadsheet** | 3.3.0 | Cliente Google Sheets |
| **resend** | 2.0.0 | Envío de emails |

---

## Arquitectura

```
dhmexraces-webhooks/
│
├── api/                           # 🔗 Endpoints Serverless
│   │
│   ├── order-created.js          # ⭐ WEBHOOK PRINCIPAL
│   │   │                         # Procesa pedidos de Shopify
│   │   │                         # 1. Extrae registration_data
│   │   │                         # 2. Genera código QR único
│   │   │                         # 3. Guarda en Google Sheets
│   │   │                         # 4. Envía email con QR
│   │   │
│   │   └── Funciones:
│   │       ├── generateCheckInCode(sede)
│   │       ├── getSheetNameFromProduct(title)
│   │       ├── saveToGoogleSheets(corredor, order, date, code)
│   │       ├── generateEmailHTML(corredor, order, sede, code)
│   │       └── handler(req, res)
│   │
│   ├── inventory.js              # 📊 API INVENTARIO FOMO
│   │   │                         # Consulta Google Sheets
│   │   │                         # Retorna disponibilidad
│   │   │                         # Cache: 60 segundos
│   │   │
│   │   └── Response:
│   │       ├── inscritos: number
│   │       ├── playeras: { total, disponibles, agotadas }
│   │       └── medallas: { total, disponibles, agotadas }
│   │
│   ├── dashboard.js              # 📈 DASHBOARD STAFF
│   │   │                         # Estadísticas de check-in
│   │   │                         # Stats por sede y categoría
│   │   │
│   │   └── Response:
│   │       ├── summary: { total, checkedIn, pending }
│   │       ├── bySede: { GUANAJUATO: {...}, ... }
│   │       ├── byCategoria: { "Elite Hombres": {...}, ... }
│   │       └── runners: [ lista de corredores ]
│   │
│   ├── check-in.js               # ✅ CHECK-IN QR
│   │   │                         # Busca código en todas las hojas
│   │   │                         # Marca CHECK_IN = "SI"
│   │   │                         # Guarda CHECK_IN_TIME
│   │   │
│   │   └── Response:
│   │       ├── success: boolean
│   │       ├── alreadyCheckedIn: boolean
│   │       ├── runner: { datos del corredor }
│   │       └── checkInTime: string
│   │
│   ├── test.js                   # 🏥 HEALTH CHECK
│   │                             # Verifica que el servidor esté vivo
│   │
│   └── test-sheets.js            # 🧪 TEST CONEXIÓN SHEETS
│                                 # Verifica credenciales de Google
│
├── public/                        # 📁 Archivos Públicos
│   ├── dashboard.html            # UI del dashboard
│   └── staff.html                # Página de staff
│
├── package.json                   # 📦 Dependencias
├── vercel.json                    # ⚙️ Configuración Vercel
└── README.md                      # 📖 Documentación
```

---

## Endpoints

### 1. POST /api/order-created

**Webhook principal** que procesa nuevos pedidos de Shopify y envía emails de confirmación.

#### URL
```
POST https://dhmexraces-webhooks.vercel.app/api/order-created
```

#### Headers
```
Content-Type: application/json
X-Shopify-Topic: orders/create
X-Shopify-Hmac-SHA256: <hmac>
X-Shopify-Shop-Domain: tu-tienda.myshopify.com
```

#### Request Body (de Shopify)

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

#### Estructura de registration_data

```json
{
  "registrations": [
    {
      "nombre": "Juan Pérez García",
      "email": "juan@email.com",
      "telefono": "5512345678",
      "fecha_nacimiento": "1990-05-15",
      "equipo": "Team Scott",
      "emergencia_nombre": "María López",
      "emergencia_telefono": "5587654321",
      "variant_id": "45678901234",
      "variant_title": "Elite Hombres",
      "product_title": "Inscripción SEDE 1 - Guanajuato 2026",
      "categoria": "Elite Hombres"
    }
  ],
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

#### Response Exitosa

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

#### Response - Sin registration_data

```json
{
  "success": true,
  "message": "No registration data found - standard order",
  "orderNumber": 1001
}
```

#### Response - Error

```json
{
  "error": "Internal server error",
  "details": "Error message here"
}
```

#### Flujo del Webhook

```
1. Recibe POST de Shopify
   └── req.body = Order completo

2. Extrae registration_data
   └── order.note_attributes.find(attr => attr.name === 'registration_data')
   └── JSON.parse(value) → { registrations: [...] }

3. Por cada corredor:
   a. Determina la sede desde el título del producto
      └── "Inscripción SEDE 1 - Guanajuato 2026" → "GUANAJUATO"

   b. Genera código QR único
      └── generateCheckInCode('GUANAJUATO') → 'DHMEX-GTO-AB12CD34'

   c. Guarda en Google Sheets
      └── sheet.addRow({
            FECHA: '15/01/2026',
            ORDEN: '1001',
            NOMBRE: 'Juan Pérez',
            EMAIL: 'juan@email.com',
            TELEFONO: '5512345678',
            FECHA DE NACIMIENTO: '1990-05-15',
            EQUIPO: 'Team Scott',
            CATEGORIA: 'Elite Hombres',
            SEDE: 'Inscripción SEDE 1 - Guanajuato 2026',
            EMERGENCIA NOMBRE: 'María López',
            EMERGENCIA TEL: '5587654321',
            QR_CODE: 'DHMEX-GTO-AB12CD34',
            CHECK_IN: 'NO',
            CHECK_IN_TIME: ''
          })

   d. Envía email
      └── resend.emails.send({
            from: 'DHMEXRACES <noreply@endhurorace.com>',
            to: 'juan@email.com',
            subject: '✅ Inscripción Confirmada - Elite Hombres | DHMEXRACES 2026',
            html: generateEmailHTML(corredor, orderNumber, sede, checkInCode)
          })

4. Retorna resumen
   └── { success: true, emailsSent: 1, savedToSheets: 1, ... }
```

---

### 2. GET /api/inventory

Retorna la disponibilidad de playeras y medallas por sede para los badges FOMO.

#### URL
```
GET https://dhmexraces-webhooks.vercel.app/api/inventory
GET https://dhmexraces-webhooks.vercel.app/api/inventory?sede=guanajuato
```

#### Parámetros Query

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `sede` | string | No | Filtrar por sede específica |

#### Valores válidos para `sede`
- `guanajuato`
- `puebla`
- `guadalajara`
- `ixtapan`
- `taxco`

#### Headers de Respuesta
```
Cache-Control: s-maxage=60, stale-while-revalidate=30
Access-Control-Allow-Origin: *
```

#### Response (sede específica)

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

#### Response (todas las sedes)

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
    "puebla": {
      "inscritos": 45,
      "playeras": { "total": 50, "disponibles": 5, "agotadas": false },
      "medallas": { "total": 100, "disponibles": 55, "agotadas": false }
    },
    "guadalajara": {
      "inscritos": 30,
      "playeras": { "total": 50, "disponibles": 20, "agotadas": false },
      "medallas": { "total": 100, "disponibles": 70, "agotadas": false }
    },
    "ixtapan": {
      "inscritos": 18,
      "playeras": { "total": 50, "disponibles": 32, "agotadas": false },
      "medallas": { "total": 100, "disponibles": 82, "agotadas": false }
    },
    "taxco": {
      "inscritos": 15,
      "playeras": { "total": 50, "disponibles": 35, "agotadas": false },
      "medallas": { "total": 100, "disponibles": 85, "agotadas": false }
    }
  }
}
```

#### Límites Configurados

| Item | Límite | Descripción |
|------|--------|-------------|
| Playeras | 50 | Primeros 50 inscritos por sede |
| Medallas | 100 | Primeros 100 inscritos por sede |

---

### 3. GET /api/dashboard

Estadísticas de check-in para el staff del evento.

#### URL
```
GET https://dhmexraces-webhooks.vercel.app/api/dashboard
GET https://dhmexraces-webhooks.vercel.app/api/dashboard?sede=guanajuato
GET https://dhmexraces-webhooks.vercel.app/api/dashboard?runners=false
```

#### Parámetros Query

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `sede` | string | No | todas | Filtrar por sede |
| `runners` | boolean | No | true | Incluir lista de corredores |

#### Response Completa

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
    "PUEBLA": {
      "registered": 30,
      "checkedIn": 20,
      "percentage": 67
    },
    "GUADALAJARA": {
      "registered": 25,
      "checkedIn": 15,
      "percentage": 60
    },
    "IXTAPAN": {
      "registered": 20,
      "checkedIn": 12,
      "percentage": 60
    },
    "TAXCO": {
      "registered": 15,
      "checkedIn": 10,
      "percentage": 67
    }
  },
  "byCategoria": {
    "Elite Hombres": {
      "registered": 15,
      "checkedIn": 12
    },
    "Elite Mujeres": {
      "registered": 8,
      "checkedIn": 7
    },
    "Master 30+ Hombres": {
      "registered": 12,
      "checkedIn": 10
    },
    "Amateur Hombres": {
      "registered": 25,
      "checkedIn": 20
    }
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
    },
    {
      "nombre": "María López",
      "email": "maria@email.com",
      "equipo": "Team Giant",
      "categoria": "Elite Mujeres",
      "sede": "GUANAJUATO",
      "orden": "1002",
      "qrCode": "DHMEX-GTO-XY78ZW12",
      "checkedIn": false,
      "checkInTime": null
    }
  ]
}
```

#### Response (sin runners)

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
  "bySede": { ... },
  "byCategoria": { ... }
}
```

---

### 4. POST /api/check-in

Marca a un corredor como presente escaneando su código QR.

#### URL
```
POST https://dhmexraces-webhooks.vercel.app/api/check-in
```

#### Request Body

```json
{
  "code": "DHMEX-GTO-AB12CD34"
}
```

#### O via Query Parameter

```
POST https://dhmexraces-webhooks.vercel.app/api/check-in?code=DHMEX-GTO-AB12CD34
```

#### Response (check-in exitoso)

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

#### Response (ya registrado anteriormente)

```json
{
  "success": true,
  "alreadyCheckedIn": true,
  "message": "Este corredor ya hizo check-in anteriormente",
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

#### Response (código no encontrado)

```json
{
  "success": false,
  "error": "Código no encontrado",
  "message": "Este código QR no está registrado en el sistema",
  "code": "DHMEX-GTO-INVALID"
}
```

#### Response (sin código)

```json
{
  "success": false,
  "error": "Código QR requerido",
  "message": "Proporciona el código QR para hacer check-in"
}
```

---

### 5. GET /api/test

Health check del servidor.

#### URL
```
GET https://dhmexraces-webhooks.vercel.app/api/test
```

#### Response

```json
{
  "status": "ok",
  "message": "DHMEXRACES Webhook Server is running",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "endpoints": {
    "orderCreated": "/api/order-created",
    "inventory": "/api/inventory",
    "dashboard": "/api/dashboard",
    "checkIn": "/api/check-in",
    "test": "/api/test"
  }
}
```

---

## Código Fuente Completo

### order-created.js (Webhook Principal)

```javascript
const { Resend } = require('resend');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ID del Google Spreadsheet
const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

// Generar código único de check-in
function generateCheckInCode(sede) {
  const sedeCode = {
    'GUANAJUATO': 'GTO',
    'PUEBLA': 'PUE',
    'GUADALAJARA': 'GDL',
    'IXTAPAN': 'IXT',
    'TAXCO': 'TAX'
  }[sede] || 'DHM';

  // Generar código alfanumérico único (8 caracteres)
  // Sin I, O, 0, 1 para evitar confusión visual
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let uniqueId = '';
  for (let i = 0; i < 8; i++) {
    uniqueId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `DHMEX-${sedeCode}-${uniqueId}`;
}

// Determinar hoja según el producto
function getSheetNameFromProduct(productTitle) {
  const title = (productTitle || '').toLowerCase();

  if (title.includes('guanajuato')) return 'GUANAJUATO';
  if (title.includes('puebla')) return 'PUEBLA';
  if (title.includes('guadalajara')) return 'GUADALAJARA';
  if (title.includes('ixtapan')) return 'IXTAPAN';
  if (title.includes('taxco')) return 'TAXCO';

  return 'GUANAJUATO'; // Default
}

// Guardar en Google Sheets
async function saveToGoogleSheets(corredor, orderNumber, orderDate, checkInCode) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return { success: false, error: 'Missing Google credentials' };
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();

    const sheetName = getSheetNameFromProduct(corredor.product_title);
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      return { success: false, error: `Sheet "${sheetName}" not found` };
    }

    await sheet.addRow({
      'FECHA': new Date(orderDate).toLocaleDateString('es-MX'),
      'ORDEN': orderNumber,
      'NOMBRE': corredor.nombre || '',
      'EMAIL': corredor.email || '',
      'TELEFONO': corredor.telefono || '',
      'FECHA DE NACIMIENTO': corredor.fecha_nacimiento || '',
      'EQUIPO': corredor.equipo || 'Independiente',
      'CATEGORIA': corredor.categoria || corredor.variant_title || '',
      'SEDE': corredor.product_title || '',
      'EMERGENCIA NOMBRE': corredor.emergencia_nombre || '',
      'EMERGENCIA TEL': corredor.emergencia_telefono || '',
      'QR_CODE': checkInCode,
      'CHECK_IN': 'NO',
      'CHECK_IN_TIME': ''
    });

    return { success: true, sheet: sheetName, checkInCode: checkInCode };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Handler principal
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const order = req.body;

    // Buscar registration_data
    const noteAttributes = order.note_attributes || [];
    const registrationAttr = noteAttributes.find(
      attr => attr.name === 'registration_data'
    );

    if (!registrationAttr || !registrationAttr.value) {
      return res.status(200).json({
        success: true,
        message: 'No registration data found - standard order',
        orderNumber: order.order_number
      });
    }

    // Parsear datos
    const registrationData = JSON.parse(registrationAttr.value);
    const corredores = registrationData.registrations || [];

    if (corredores.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No runners in registration data'
      });
    }

    const emailResults = [];
    const sheetsResults = [];
    const orderDate = order.created_at || new Date().toISOString();

    // Procesar cada corredor
    for (const corredor of corredores) {
      const sheetName = getSheetNameFromProduct(corredor.product_title);
      const checkInCode = generateCheckInCode(sheetName);

      // Guardar en Sheets
      const sheetResult = await saveToGoogleSheets(
        corredor,
        order.order_number || order.name,
        orderDate,
        checkInCode
      );
      sheetsResults.push({
        nombre: corredor.nombre,
        checkInCode: checkInCode,
        ...sheetResult
      });

      // Enviar email
      if (corredor.email) {
        try {
          const { data, error } = await resend.emails.send({
            from: 'DHMEXRACES <noreply@endhurorace.com>',
            to: corredor.email,
            subject: `✅ Inscripción Confirmada - ${corredor.categoria} | DHMEXRACES 2026`,
            html: generateEmailHTML(corredor, order.order_number, corredor.product_title, checkInCode),
          });

          emailResults.push({
            nombre: corredor.nombre,
            email: corredor.email,
            status: error ? 'error' : 'sent',
            id: data?.id,
            error: error?.message
          });
        } catch (sendError) {
          emailResults.push({
            nombre: corredor.nombre,
            email: corredor.email,
            status: 'error',
            error: sendError.message
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      orderNumber: order.order_number || order.name,
      totalRunners: corredores.length,
      emailsSent: emailResults.filter(r => r.status === 'sent').length,
      savedToSheets: sheetsResults.filter(r => r.success).length,
      emailResults,
      sheetsResults
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
```

### inventory.js

```javascript
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

const LIMITS = {
  playeras: 50,
  medallas: 100
};

const SHEET_NAMES = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sedeQuery = req.query.sede;

  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: 'Configuración incompleta' });
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();

    const sheetsToProcess = sedeQuery ? [sedeQuery.toUpperCase()] : SHEET_NAMES;
    const inventory = {};
    let totalInscritos = 0;

    for (const sheetName of sheetsToProcess) {
      const sheet = doc.sheetsByTitle[sheetName];
      if (!sheet) {
        inventory[sheetName.toLowerCase()] = {
          error: 'Sede no encontrada',
          inscritos: 0,
          playeras: { total: LIMITS.playeras, disponibles: LIMITS.playeras, agotadas: false },
          medallas: { total: LIMITS.medallas, disponibles: LIMITS.medallas, agotadas: false }
        };
        continue;
      }

      const rows = await sheet.getRows();
      const inscritos = rows.filter(row => row.NOMBRE && row.NOMBRE.trim() !== '').length;
      totalInscritos += inscritos;

      const playerasDisponibles = Math.max(0, LIMITS.playeras - inscritos);
      const medallasDisponibles = Math.max(0, LIMITS.medallas - inscritos);

      inventory[sheetName.toLowerCase()] = {
        inscritos,
        playeras: {
          total: LIMITS.playeras,
          entregadas: Math.min(inscritos, LIMITS.playeras),
          disponibles: playerasDisponibles,
          agotadas: playerasDisponibles === 0
        },
        medallas: {
          total: LIMITS.medallas,
          entregadas: Math.min(inscritos, LIMITS.medallas),
          disponibles: medallasDisponibles,
          agotadas: medallasDisponibles === 0
        }
      };
    }

    if (sedeQuery) {
      const sedeData = inventory[sedeQuery.toLowerCase()];
      return res.status(200).json({
        success: true,
        sede: sedeQuery.toUpperCase(),
        timestamp: new Date().toISOString(),
        ...sedeData
      });
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      limits: LIMITS,
      totalInscritos,
      sedes: inventory
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
```

### check-in.js

```javascript
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';
const SHEET_NAMES = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const code = req.query.code || req.body?.code;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Código QR requerido',
      message: 'Proporciona el código QR para hacer check-in'
    });
  }

  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Configuración incompleta'
      });
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();

    let foundRunner = null;
    let foundSheet = null;
    let foundRow = null;

    for (const sheetName of SHEET_NAMES) {
      const sheet = doc.sheetsByTitle[sheetName];
      if (!sheet) continue;

      const rows = await sheet.getRows();

      for (const row of rows) {
        if (row.QR_CODE === code) {
          foundRunner = {
            nombre: row.NOMBRE,
            email: row.EMAIL,
            telefono: row.TELEFONO,
            equipo: row.EQUIPO,
            categoria: row.CATEGORIA,
            sede: row.SEDE,
            orden: row.ORDEN,
            qrCode: row.QR_CODE,
            checkIn: row.CHECK_IN,
            checkInTime: row.CHECK_IN_TIME
          };
          foundSheet = sheetName;
          foundRow = row;
          break;
        }
      }

      if (foundRunner) break;
    }

    if (!foundRunner) {
      return res.status(404).json({
        success: false,
        error: 'Código no encontrado',
        message: 'Este código QR no está registrado en el sistema',
        code: code
      });
    }

    if (foundRunner.checkIn === 'SI' || foundRunner.checkIn === 'SÍ') {
      return res.status(200).json({
        success: true,
        alreadyCheckedIn: true,
        message: 'Este corredor ya hizo check-in anteriormente',
        runner: foundRunner,
        sede: foundSheet,
        checkInTime: foundRunner.checkInTime
      });
    }

    const checkInTime = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    foundRow.CHECK_IN = 'SI';
    foundRow.CHECK_IN_TIME = checkInTime;
    await foundRow.save();

    return res.status(200).json({
      success: true,
      alreadyCheckedIn: false,
      message: '¡Check-in exitoso!',
      runner: {
        ...foundRunner,
        checkIn: 'SI',
        checkInTime: checkInTime
      },
      sede: foundSheet,
      checkInTime: checkInTime
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error del servidor',
      message: error.message
    });
  }
};
```

---

## Formato del Código QR

### Estructura

```
DHMEX-{SEDE}-{UNIQUE_ID}
```

| Parte | Descripción | Ejemplo |
|-------|-------------|---------|
| `DHMEX` | Prefijo fijo | `DHMEX` |
| `SEDE` | Código de 3 letras | `GTO`, `PUE`, `GDL`, `IXT`, `TAX` |
| `UNIQUE_ID` | 8 caracteres alfanuméricos | `AB12CD34` |

### Códigos de Sede

| Sede | Código |
|------|--------|
| GUANAJUATO | GTO |
| PUEBLA | PUE |
| GUADALAJARA | GDL |
| IXTAPAN | IXT |
| TAXCO | TAX |

### Caracteres Permitidos

```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

**Nota**: Se excluyen `I`, `O`, `0`, `1` para evitar confusión visual.

### Ejemplos

```
DHMEX-GTO-AB12CD34
DHMEX-PUE-XY78ZW12
DHMEX-GDL-MNPQ5678
DHMEX-IXT-RSTU9ABC
DHMEX-TAX-DEFG2HIJ
```

---

## Email de Confirmación

### Estructura del Email

```
┌─────────────────────────────────────────────────┐
│  [LOGO DHMEXRACES - SCOTT - SHIMANO]            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ¡Felicidades {nombre}!                         │
│  Estás oficialmente inscrito en                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  [{CATEGORIA}]                          │   │
│  │                                         │   │
│  │  Sede: {sede}                           │   │
│  │  Nombre: {nombre}                       │   │
│  │  Fecha Nac: {fecha_nacimiento}          │   │
│  │  Equipo: {equipo}                       │   │
│  │  Email: {email}                         │   │
│  │  Teléfono: {telefono}                   │   │
│  │  Emergencia: {emergencia_nombre}        │   │
│  │  Tel. Emerg: {emergencia_telefono}      │   │
│  │  Confirmación: #{orderNumber}           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     TU PASE DE CHECK-IN                 │   │
│  │         [QR CODE IMAGE]                 │   │
│  │     {checkInCode}                       │   │
│  │  Presenta este código el día del evento │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Tu inscripción incluye:                        │
│  ✓ Puntos Campeonato Nacional                   │
│  ✓ Chip de Cronometraje                         │
│  ✓ Acceso a Práctica y Carrera                  │
│  ✓ Más de $100,000 MXN en premios              │
│                                                 │
│  [MECÁNICA NEUTRAL SHIMANO]                     │
│  [EQUIPO OBLIGATORIO]                           │
│  [SÍGUENOS EN INSTAGRAM]                        │
│  [LOGOS PATROCINADORES]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Colores del Email

| Color | Hex | Uso |
|-------|-----|-----|
| Primario | `#E42C2C` | Badges, botones, acentos |
| Secundario | `#0066B3` | Shimano, countdown |
| Fondo | `#000000` | Background principal |
| Texto | `#FFFFFF` | Texto principal |
| Muted | `rgba(255,255,255,0.6)` | Texto secundario |

### URL del QR

```javascript
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkInCode)}&bgcolor=FFFFFF&color=000000`;
```

---

## Configuración de Vercel

### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

### package.json

```json
{
  "name": "dhmexraces-webhooks",
  "version": "1.0.0",
  "description": "Webhook server for DHMEXRACES registrations",
  "main": "api/order-created.js",
  "dependencies": {
    "google-spreadsheet": "^3.3.0",
    "resend": "^2.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Variables de Entorno

### Configurar en Vercel

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

### Importante sobre GOOGLE_PRIVATE_KEY

Los saltos de línea deben ser `\n` literales, no saltos reales.

```
Correcto: -----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n

Incorrecto:
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhki...
-----END PRIVATE KEY-----
```

---

## CORS y Headers

Todos los endpoints permiten CORS desde cualquier origen:

```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

### Preflight (OPTIONS)

```javascript
if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

---

## Logs y Monitoreo

### Ver logs en tiempo real

```bash
vercel logs --follow
```

### Dashboard de Vercel

1. Ir a **Vercel Dashboard**
2. Seleccionar proyecto
3. Click en **Functions**
4. Click en **Logs**

### Console.log en el código

```javascript
console.log('🚀 Webhook recibido - Method:', req.method);
console.log('📦 Order ID:', order.id);
console.log('✅ Email enviado a:', corredor.email);
console.log('❌ Error:', error.message);
```

---

## Troubleshooting

### Webhook no se ejecuta

1. Verificar URL en Shopify Admin → Settings → Notifications → Webhooks
2. Verificar que el endpoint responda a POST
3. Revisar logs de Vercel

### Email no se envía

1. Verificar `RESEND_API_KEY`
2. Verificar que el corredor tenga email válido
3. Verificar dominio en Resend (debe ser verificado)
4. Revisar logs de Vercel

### No guarda en Google Sheets

1. Verificar `GOOGLE_SERVICE_ACCOUNT_EMAIL`
2. Verificar `GOOGLE_PRIVATE_KEY` (escapar `\n`)
3. Verificar que la cuenta tenga acceso al spreadsheet
4. Verificar que la hoja exista (GUANAJUATO, PUEBLA, etc.)

### Check-in falla

1. Verificar formato del código QR (`DHMEX-XXX-XXXXXXXX`)
2. Verificar que el código exista en alguna hoja
3. Revisar conexión a Google Sheets

### Error "The caller does not have permission"

1. Abrir el spreadsheet en Google Sheets
2. Click **Share**
3. Agregar el email de la cuenta de servicio como **Editor**
4. Guardar

### Error "Invalid grant"

1. Regenerar la clave privada en Google Cloud Console
2. Actualizar `GOOGLE_PRIVATE_KEY` en Vercel
3. Asegurar que los `\n` sean literales

### Timeout en webhook

Los webhooks de Vercel tienen límite de 10 segundos (free) o 60 segundos (pro).

Optimizaciones:
- Reducir consultas a Google Sheets
- Procesar en paralelo cuando sea posible
- Usar queues para procesamientos largos
