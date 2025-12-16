# DHMEXRACES - Copa Scott DHMEXRACES 2026

Sistema completo de inscripciones para el campeonato nacional de downhill MTB más grande de México.

![Shopify](https://img.shields.io/badge/Shopify-7AB55C?style=flat&logo=shopify&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=flat&logo=google-sheets&logoColor=white)

## Descripción General

Este proyecto integra tres componentes principales:

```
DHMEXRACES-theme/
├── dhmexraces-custom/       # Tema personalizado de Shopify
├── dhmexraces-webhooks/     # Servidor de webhooks (Vercel)
└── excel-to-ranking-converter.html  # Utilidad de conversión
```

### Arquitectura del Sistema

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   SHOPIFY       │────▶│  VERCEL          │────▶│ GOOGLE SHEETS   │
│   (Frontend)    │     │  (Webhooks/API)  │     │ (Base de datos) │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ • Tema custom   │     │ • order-created  │     │ • GUANAJUATO    │
│ • Inscripciones │     │ • inventory      │     │ • PUEBLA        │
│ • Productos     │     │ • dashboard      │     │ • GUADALAJARA   │
│ • Checkout      │     │ • check-in       │     │ • IXTAPAN       │
└─────────────────┘     └──────────────────┘     │ • TAXCO         │
                               │                 └─────────────────┘
                               ▼
                        ┌──────────────┐
                        │   RESEND     │
                        │   (Emails)   │
                        └──────────────┘
```

## Flujo de Inscripción

1. **Usuario visita la tienda** → Selecciona producto de inscripción
2. **Selecciona categoría** → Elige variante (Elite, Amateur, Master, etc.)
3. **Completa formulario** → Datos personales, equipo, contacto emergencia
4. **Checkout Shopify** → Pago procesado por Shopify
5. **Webhook disparado** → Shopify notifica a Vercel
6. **Procesamiento**:
   - Genera código QR único para check-in
   - Guarda datos en Google Sheets
   - Envía email de confirmación con QR
7. **Día del evento** → Staff escanea QR para check-in

## Componentes

### 1. Tema Shopify (`dhmexraces-custom/`)

Tema personalizado basado en Skeleton con secciones específicas para carreras:

| Sección | Descripción |
|---------|-------------|
| `product.liquid` | Página de inscripción con formulario dinámico |
| `race-registration.liquid` | Cards de categorías en home |
| `ranking.liquid` | Tablas de posiciones por sede |
| `kit-rider.liquid` | Beneficios incluidos en inscripción |
| `sponsors.liquid` | Patrocinadores del campeonato |
| `hero-video.liquid` | Banner principal con video |

**[📖 Documentación completa del tema →](./docs/SHOPIFY-THEME.md)**

### 2. Webhooks API (`dhmexraces-webhooks/`)

Servidor serverless en Vercel que procesa webhooks de Shopify:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/test` | GET | Health check del servidor |
| `/api/order-created` | POST | Webhook de Shopify (orders/create) |
| `/api/inventory` | GET | Disponibilidad de playeras/medallas |
| `/api/dashboard` | GET | Estadísticas de check-in |
| `/api/check-in` | POST | Marcar corredor como presente |

**[📖 Documentación completa de la API →](./docs/WEBHOOKS-API.md)**

### 3. Google Sheets (Base de Datos)

Spreadsheet con una hoja por sede que almacena:
- Datos del corredor
- Número de orden
- Código QR único
- Estado de check-in

**[📖 Guía de configuración →](./docs/GOOGLE-SHEETS.md)**

## Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Shopify CLI (`npm install -g @shopify/cli`)
- Vercel CLI (`npm install -g vercel`)
- Cuenta de Google Cloud con API de Sheets habilitada
- Cuenta de Resend para envío de emails

### 1. Clonar el repositorio

```bash
git clone https://github.com/Gibrangomz/DHMEXRACES-SHOPIFY.git
cd DHMEXRACES-SHOPIFY
```

### 2. Configurar el tema de Shopify

```bash
cd dhmexraces-custom
shopify theme dev --store tu-tienda.myshopify.com
```

### 3. Configurar los webhooks

```bash
cd ../dhmexraces-webhooks
npm install
vercel env add RESEND_API_KEY
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel --prod
```

### 4. Configurar webhook en Shopify

1. Ve a **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. Click **Create webhook**
3. Event: `Order creation`
4. Format: `JSON`
5. URL: `https://tu-proyecto.vercel.app/api/order-created`

## Variables de Entorno

### Webhooks (Vercel)

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API Key de Resend para envío de emails |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email de la cuenta de servicio de Google |
| `GOOGLE_PRIVATE_KEY` | Llave privada de la cuenta de servicio |

## Metafields de Producto

Los productos de inscripción usan metafields para configurar precios dinámicos:

| Metafield | Tipo | Descripción |
|-----------|------|-------------|
| `custom.pricing_enabled` | Boolean | Activa precios por fases |
| `custom.phase1_price` | Number | Precio Early Bird |
| `custom.phase1_label` | Text | Etiqueta fase 1 |
| `custom.phase1_end` | Date | Fin de fase 1 |
| `custom.phase2_price` | Number | Precio Regular |
| `custom.phase2_label` | Text | Etiqueta fase 2 |
| `custom.phase2_end` | Date | Fin de fase 2 |
| `custom.phase3_price` | Number | Precio Late |
| `custom.phase3_label` | Text | Etiqueta fase 3 |
| `custom.event_date` | Date | Fecha del evento |
| `custom.event_date_label` | Text | Label del evento |
| `custom.close_date` | Date | Cierre de inscripciones |

**[📖 Guía completa de metafields →](./docs/METAFIELDS.md)**

## Sedes del Campeonato 2026

| Sede | Fecha | Estado |
|------|-------|--------|
| Guanajuato | TBD | Activo |
| Puebla | TBD | Próximamente |
| Guadalajara | TBD | Próximamente |
| Ixtapan | TBD | Próximamente |
| Taxco | TBD | Próximamente |

## Categorías

- Elite Hombres / Elite Mujeres
- Master 30+ Hombres / Master 30+ Mujeres
- Veteranos 40+ Hombres / Veteranos 40+ Mujeres
- Amateur Hombres / Amateur Mujeres
- Juvenil (14-17) Hombres / Mujeres
- Infantil (10-13) Hombres / Mujeres
- Open Hardtail

## Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| **Shopify** | E-commerce, checkout, productos |
| **Liquid** | Templates del tema |
| **JavaScript** | Interactividad frontend |
| **Vercel** | Hosting serverless functions |
| **Google Sheets API** | Base de datos de corredores |
| **Resend** | Envío de emails transaccionales |

## Estructura de Archivos

```
DHMEXRACES-theme/
├── dhmexraces-custom/           # Tema Shopify
│   ├── assets/                  # CSS, JS, imágenes
│   ├── blocks/                  # Bloques reutilizables
│   ├── config/                  # Configuración del tema
│   ├── layout/                  # Layouts base
│   ├── locales/                 # Traducciones
│   ├── sections/                # Secciones del tema
│   │   ├── product.liquid       # ⭐ Página de inscripción
│   │   ├── race-registration.liquid
│   │   ├── ranking.liquid
│   │   ├── kit-rider.liquid
│   │   └── ...
│   ├── snippets/                # Fragmentos reutilizables
│   └── templates/               # Templates JSON
│
├── dhmexraces-webhooks/         # Servidor Vercel
│   ├── api/
│   │   ├── order-created.js     # ⭐ Webhook principal
│   │   ├── inventory.js         # Inventario FOMO
│   │   ├── dashboard.js         # Stats check-in
│   │   ├── check-in.js          # Registro QR
│   │   └── test.js              # Health check
│   ├── package.json
│   └── vercel.json
│
├── docs/                        # Documentación
│   ├── SHOPIFY-THEME.md
│   ├── WEBHOOKS-API.md
│   ├── METAFIELDS.md
│   ├── GOOGLE-SHEETS.md
│   └── DEPLOYMENT.md
│
└── README.md                    # Este archivo
```

## Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Add nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Soporte

- **Email**: contacto@dhmexraces.com
- **Instagram**: [@dhmex_races](https://instagram.com/dhmex_races)
- **Web**: [endhurorace.com](https://endhurorace.com)

## Licencia

Este proyecto es propietario de DHMEXRACES. Todos los derechos reservados.

---

**DHMEXRACES 2026** - El campeonato nacional de downhill MTB más grande de México

*$530,000 MXN en premios • 5 sedes • 13 categorías*
