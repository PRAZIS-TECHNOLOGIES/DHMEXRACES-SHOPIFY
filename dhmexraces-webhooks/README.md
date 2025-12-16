# DHMEXRACES Webhooks Server

Servidor de webhooks para procesar pedidos de Shopify y enviar emails de confirmación individuales a cada corredor inscrito.

## Stack

- **Runtime:** Vercel Serverless Functions
- **Email:** Resend API
- **Trigger:** Shopify Webhook (orders/create)

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno en Vercel

```bash
vercel env add RESEND_API_KEY
```

Ingresa tu API Key de Resend: `re_xxxxxxxxx`

### 3. Deploy a Vercel

```bash
vercel --prod
```

### 4. Configurar Webhook en Shopify

1. Ve a **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. Click **Create webhook**
3. Configura:
   - **Event:** Order creation
   - **Format:** JSON
   - **URL:** `https://tu-proyecto.vercel.app/api/order-created`
4. Guarda y copia el **Webhook signing secret** (opcional para verificación)

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/test` | GET | Health check |
| `/api/order-created` | POST | Webhook de Shopify |
| `/api/dashboard` | GET | Estadísticas de check-in por sede |
| `/api/check-in` | POST | Marcar check-in de corredor |
| `/api/inventory` | GET | Inventario de playeras y medallas disponibles |

### Endpoint: `/api/inventory`

Retorna la disponibilidad de playeras (50 primeros) y medallas (100 primeros) por sede.

**Query Parameters:**
- `sede` (opcional): guanajuato, puebla, guadalajara, ixtapan, taxco

**Ejemplo:**
```bash
# Una sede específica
curl https://tu-proyecto.vercel.app/api/inventory?sede=guanajuato

# Todas las sedes
curl https://tu-proyecto.vercel.app/api/inventory
```

**Response:**
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

## Flujo

1. Cliente completa checkout en Shopify
2. Shopify envía webhook a `/api/order-created`
3. El servidor extrae `registration_data` del pedido
4. Por cada corredor registrado, envía email individual vía Resend
5. Retorna resumen de emails enviados

## Formato de registration_data

El formulario de inscripción guarda datos en `cart.attributes.registration_data`:

```json
{
  "registrations": [
    {
      "variant_id": "123456",
      "variant_title": "Elite Hombres",
      "product_title": "Inscripción SEDE 1 - Guanajuato 2026",
      "nombre": "Juan Pérez",
      "fecha_nacimiento": "1990-05-15",
      "equipo": "Team Scott",
      "email": "juan@ejemplo.com",
      "telefono": "5512345678",
      "categoria": "Elite Hombres"
    }
  ],
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

## Testing Local

```bash
vercel dev
```

Envía un POST a `http://localhost:3000/api/order-created` con el body de un pedido de Shopify.

## Logs

Ver logs en Vercel Dashboard → Functions → Logs

---

**DHMEXRACES 2026** - El campeonato nacional de downhill MTB más grande de México
