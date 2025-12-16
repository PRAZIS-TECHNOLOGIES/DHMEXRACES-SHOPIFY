# DHMEXRACES - Copa Scott DHMEXRACES 2026

> Sistema completo de inscripciones para el campeonato nacional de downhill MTB más grande de México.

![Shopify](https://img.shields.io/badge/Shopify-7AB55C?style=flat&logo=shopify&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=flat&logo=google-sheets&logoColor=white)
![Resend](https://img.shields.io/badge/Resend-000000?style=flat&logo=mail&logoColor=white)

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo Completo de Inscripción](#flujo-completo-de-inscripción)
4. [Componentes del Sistema](#componentes-del-sistema)
5. [Estructura de Archivos](#estructura-de-archivos)
6. [Inicio Rápido](#inicio-rápido)
7. [Configuración Detallada](#configuración-detallada)
8. [Variables de Entorno](#variables-de-entorno)
9. [Sedes del Campeonato](#sedes-del-campeonato)
10. [Categorías](#categorías)
11. [Stack Tecnológico](#stack-tecnológico)
12. [Documentación Adicional](#documentación-adicional)
13. [Contribuir](#contribuir)
14. [Soporte](#soporte)

---

## Descripción General

DHMEXRACES es el campeonato nacional de downhill MTB más grande de México, con 5 sedes, 13 categorías y más de $530,000 MXN en premios. Este repositorio contiene el sistema completo de inscripciones que incluye:

- **Tienda Shopify**: Tema personalizado para venta de inscripciones
- **Servidor de Webhooks**: Procesamiento automático de pedidos
- **Base de Datos**: Google Sheets para almacenar corredores
- **Sistema de Emails**: Confirmaciones automáticas con código QR
- **Sistema de Check-in**: Escaneo de QR el día del evento

### Características Principales

| Característica | Descripción |
|----------------|-------------|
| **Precios Dinámicos** | Early Bird, Regular, Late - cambio automático por fechas |
| **FOMO Badges** | Muestra playeras y medallas disponibles en tiempo real |
| **Formulario de Inscripción** | Captura datos completos del corredor |
| **Emails Automáticos** | Confirmación con QR único para check-in |
| **Check-in Digital** | Escaneo de QR el día del evento |
| **Dashboard de Staff** | Estadísticas en tiempo real |
| **Multi-sede** | 5 sedes con inventario independiente |
| **13 Categorías** | Desde Infantil hasta Elite |

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USUARIO FINAL                                   │
│                         (Corredor que se inscribe)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHOPIFY STOREFRONT                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Página de     │  │   Formulario    │  │    Checkout     │             │
│  │   Producto      │  │   Inscripción   │  │    Shopify      │             │
│  │                 │  │                 │  │                 │             │
│  │ • FOMO badges   │  │ • Nombre        │  │ • Pago seguro   │             │
│  │ • Precio fase   │  │ • Email         │  │ • Confirmación  │             │
│  │ • Countdown     │  │ • Teléfono      │  │                 │             │
│  │ • Categorías    │  │ • Fecha nac.    │  │                 │             │
│  │                 │  │ • Equipo        │  │                 │             │
│  │                 │  │ • Emergencia    │  │                 │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           │         ┌──────────┴──────────┐        │                       │
│           │         │  Cart Attributes    │        │                       │
│           │         │  registration_data  │        │                       │
│           │         └──────────┬──────────┘        │                       │
│           │                    │                    │                       │
│           └────────────────────┴────────────────────┘                       │
│                                │                                            │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   SHOPIFY WEBHOOK       │
                    │   orders/create         │
                    └────────────┬────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL SERVERLESS                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      /api/order-created                              │   │
│  │                                                                      │   │
│  │  1. Recibe webhook de Shopify                                       │   │
│  │  2. Extrae registration_data de note_attributes                     │   │
│  │  3. Por cada corredor:                                              │   │
│  │     a. Genera código QR único (DHMEX-GTO-XXXXXXXX)                  │   │
│  │     b. Guarda en Google Sheets                                      │   │
│  │     c. Envía email con QR vía Resend                               │   │
│  │  4. Retorna resumen de operación                                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  /api/inventory  │  │  /api/dashboard  │  │  /api/check-in   │          │
│  │                  │  │                  │  │                  │          │
│  │  Playeras: 23    │  │  Inscritos: 135  │  │  QR: DHMEX-GTO-  │          │
│  │  Medallas: 73    │  │  Check-in: 89    │  │  AB12CD34        │          │
│  │                  │  │  Pendiente: 46   │  │  → CHECK_IN: SI  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  GOOGLE SHEETS  │  │     RESEND      │  │   QR SERVER     │
│                 │  │                 │  │                 │
│ • GUANAJUATO    │  │ Email HTML con: │  │ api.qrserver.   │
│ • PUEBLA        │  │ • Datos corredor│  │ com             │
│ • GUADALAJARA   │  │ • Código QR     │  │                 │
│ • IXTAPAN       │  │ • Beneficios    │  │ Genera imagen   │
│ • TAXCO         │  │ • Patrocinadores│  │ del QR          │
│                 │  │                 │  │                 │
│ Columnas:       │  │ From:           │  │                 │
│ • NOMBRE        │  │ DHMEXRACES      │  │                 │
│ • EMAIL         │  │ <noreply@       │  │                 │
│ • CATEGORIA     │  │ endhurorace.com>│  │                 │
│ • QR_CODE       │  │                 │  │                 │
│ • CHECK_IN      │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Flujo de Datos Detallado

```
1. INSCRIPCIÓN (Usuario)
   └── Shopify Product Page
       └── Selecciona categoría (variante)
       └── Completa formulario
       └── Datos guardados en sessionStorage
       └── Click "Agregar al carrito"
           └── POST /cart/update.js (guarda registration_data)
           └── POST /cart/add.js (agrega producto)
           └── Redirect a /cart

2. CHECKOUT (Usuario)
   └── Shopify Checkout
       └── Ingresa datos de pago
       └── Confirma compra
       └── Shopify crea Order

3. WEBHOOK (Automático)
   └── Shopify dispara webhook orders/create
       └── POST https://dhmexraces-webhooks.vercel.app/api/order-created
           └── Body: Order completo con note_attributes

4. PROCESAMIENTO (Servidor)
   └── Vercel recibe webhook
       └── Extrae note_attributes.registration_data
       └── JSON.parse() → Array de corredores
       └── Por cada corredor:
           └── generateCheckInCode() → "DHMEX-GTO-AB12CD34"
           └── saveToGoogleSheets() → Fila en hoja GUANAJUATO
           └── resend.emails.send() → Email con QR

5. CONFIRMACIÓN (Usuario)
   └── Recibe email
       └── Contiene código QR
       └── Contiene datos de inscripción
       └── Contiene información del evento

6. CHECK-IN (Día del evento)
   └── Staff escanea QR
       └── GET /api/check-in?code=DHMEX-GTO-AB12CD34
           └── Busca en Google Sheets
           └── Actualiza CHECK_IN = "SI"
           └── Actualiza CHECK_IN_TIME
           └── Retorna datos del corredor
```

---

## Flujo Completo de Inscripción

### Paso 1: Usuario visita página de producto

El usuario llega a la página del producto de inscripción (ej: `Inscripción SEDE 1 - Guanajuato 2026`).

**Lo que ve:**
- Banner con imagen del evento
- Badges FOMO: "23 playeras disponibles", "73 medallas disponibles"
- Precio actual según fase (Early Bird $1,200 / Regular $1,350 / Late $1,500)
- Countdown: "Faltan 45d 12h 30m para Guanajuato 2026"
- Grid de categorías disponibles

### Paso 2: Selecciona categoría

El usuario hace clic en su categoría (ej: "Elite Hombres").

**Lo que sucede:**
- Se resalta la categoría seleccionada
- Se actualiza el precio si hay diferencia por categoría
- Aparece el formulario de inscripción

### Paso 3: Completa formulario

El usuario llena todos los campos:

| Campo | Tipo | Requerido | Ejemplo |
|-------|------|-----------|---------|
| Nombre completo | text | Sí | Juan Pérez García |
| Email | email | Sí | juan@email.com |
| Teléfono | tel | Sí | 5512345678 |
| Fecha de nacimiento | date | Sí | 1990-05-15 |
| Equipo | text | No | Team Scott |
| Contacto emergencia | text | Sí | María López |
| Tel. emergencia | tel | Sí | 5587654321 |

### Paso 4: Agrega al carrito

Al hacer clic en "Inscribirme":

1. Se validan todos los campos
2. Se crea objeto `registration_data`:

```javascript
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

3. Se guarda en cart attributes via `/cart/update.js`
4. Se agrega producto al carrito via `/cart/add.js`
5. Redirección a `/cart`

### Paso 5: Checkout

El usuario procede al checkout de Shopify estándar:
- Ingresa información de envío (si aplica)
- Selecciona método de pago
- Confirma la compra

### Paso 6: Procesamiento automático

Una vez confirmado el pago:

1. **Shopify crea la orden**
2. **Dispara webhook** `orders/create` a Vercel
3. **Vercel procesa**:
   - Genera código QR único: `DHMEX-GTO-AB12CD34`
   - Guarda fila en Google Sheets (hoja GUANAJUATO)
   - Envía email de confirmación con QR

### Paso 7: Email de confirmación

El corredor recibe un email profesional que incluye:

- Logo oficial DHMEXRACES
- Mensaje de bienvenida personalizado
- Card con todos sus datos
- **Código QR grande y legible**
- Lista de beneficios incluidos
- Información de mecánica neutral Shimano
- Equipo obligatorio (casco, guantes, rodilleras)
- Link a Instagram
- Logos de patrocinadores

### Paso 8: Check-in (día del evento)

El día de la carrera:

1. Staff abre app de check-in
2. Escanea QR del corredor
3. Sistema verifica y marca como presente
4. Corredor recibe su kit (playera, medalla si aplica, race plate)

---

## Componentes del Sistema

### 1. Tema Shopify (`dhmexraces-custom/`)

Tema personalizado basado en Skeleton con las siguientes secciones:

#### Secciones Principales

| Sección | Archivo | Descripción |
|---------|---------|-------------|
| Página de Producto | `sections/product.liquid` | Formulario de inscripción, precios dinámicos, FOMO |
| Cards de Inscripción | `sections/race-registration.liquid` | Grid de categorías en home |
| Rankings | `sections/ranking.liquid` | Tablas de posiciones |
| Kit del Rider | `sections/kit-rider.liquid` | Beneficios de inscripción |
| Patrocinadores | `sections/sponsors.liquid` | Logos por tier |
| Hero Video | `sections/hero-video.liquid` | Banner principal |
| Header | `sections/header.liquid` | Navegación |
| Footer | `sections/footer.liquid` | Links y redes |

#### Características del Tema

**Precios Dinámicos:**
- Configurados via metafields
- 3 fases: Early Bird, Regular, Late
- Cambio automático por fecha
- Countdown hasta próximo aumento

**FOMO Badges:**
- Consulta API de inventario
- Muestra playeras disponibles (50 primeros)
- Muestra medallas disponibles (100 primeros)
- Actualización cada 60 segundos (cache)

**Formulario de Inscripción:**
- Validación en tiempo real
- Campos requeridos marcados
- Datos guardados en cart attributes
- Compatible con múltiples inscripciones

**[📖 Ver documentación completa del tema →](./docs/SHOPIFY-THEME.md)**

---

### 2. Servidor de Webhooks (`dhmexraces-webhooks/`)

Servidor serverless en Vercel con 5 endpoints:

#### Endpoints

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/test` | GET | Health check | No |
| `/api/order-created` | POST | Webhook de Shopify | Shopify |
| `/api/inventory` | GET | Inventario FOMO | No |
| `/api/dashboard` | GET | Stats check-in | No |
| `/api/check-in` | POST | Marcar presente | No |

#### Flujo del Webhook Principal

```javascript
// /api/order-created.js

1. Recibe POST de Shopify
   └── req.body = Order completo

2. Extrae registration_data
   └── order.note_attributes.find(attr => attr.name === 'registration_data')
   └── JSON.parse(value) → { registrations: [...] }

3. Por cada corredor:
   a. Genera código QR
      └── generateCheckInCode('GUANAJUATO') → 'DHMEX-GTO-AB12CD34'

   b. Guarda en Google Sheets
      └── sheet.addRow({
            FECHA: '15/01/2026',
            ORDEN: '1001',
            NOMBRE: 'Juan Pérez',
            EMAIL: 'juan@email.com',
            // ... más campos
            QR_CODE: 'DHMEX-GTO-AB12CD34',
            CHECK_IN: 'NO',
            CHECK_IN_TIME: ''
          })

   c. Envía email
      └── resend.emails.send({
            from: 'DHMEXRACES <noreply@endhurorace.com>',
            to: 'juan@email.com',
            subject: '✅ Inscripción Confirmada - Elite Hombres | DHMEXRACES 2026',
            html: generateEmailHTML(corredor, orderNumber, sede, checkInCode)
          })

4. Retorna resumen
   └── { success: true, emailsSent: 1, savedToSheets: 1 }
```

**[📖 Ver documentación completa de la API →](./docs/WEBHOOKS-API.md)**

---

### 3. Google Sheets (Base de Datos)

Spreadsheet con una hoja por sede:

#### Estructura

```
📊 DHMEXRACES 2026
├── GUANAJUATO (27 corredores)
├── PUEBLA (0 corredores)
├── GUADALAJARA (0 corredores)
├── IXTAPAN (0 corredores)
└── TAXCO (0 corredores)
```

#### Columnas por Hoja

| # | Columna | Tipo | Descripción |
|---|---------|------|-------------|
| A | FECHA | Texto | Fecha de inscripción |
| B | ORDEN | Texto | Número de orden Shopify |
| C | NOMBRE | Texto | Nombre completo |
| D | EMAIL | Texto | Correo electrónico |
| E | TELEFONO | Texto | Teléfono |
| F | FECHA DE NACIMIENTO | Texto | Fecha de nacimiento |
| G | EQUIPO | Texto | Nombre del equipo |
| H | CATEGORIA | Texto | Categoría de inscripción |
| I | SEDE | Texto | Producto/evento |
| J | EMERGENCIA NOMBRE | Texto | Contacto de emergencia |
| K | EMERGENCIA TEL | Texto | Teléfono de emergencia |
| L | QR_CODE | Texto | Código único check-in |
| M | CHECK_IN | Texto | SI / NO |
| N | CHECK_IN_TIME | Texto | Fecha y hora del check-in |

**[📖 Ver documentación completa de Google Sheets →](./docs/GOOGLE-SHEETS.md)**

---

### 4. Sistema de Emails (Resend)

Emails transaccionales enviados automáticamente:

#### Template del Email

```
┌─────────────────────────────────────────────────┐
│  [LOGO DHMEXRACES - SCOTT - SHIMANO]            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ¡Felicidades Juan!                             │
│  Estás oficialmente inscrito en                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  [ELITE HOMBRES]                        │   │
│  │                                         │   │
│  │  Sede: Inscripción SEDE 1 - Guanajuato │   │
│  │                                         │   │
│  │  Nombre:      Juan Pérez García        │   │
│  │  Fecha Nac:   1990-05-15               │   │
│  │  Equipo:      Team Scott               │   │
│  │  Email:       juan@email.com           │   │
│  │  Teléfono:    5512345678               │   │
│  │  Emergencia:  María López              │   │
│  │  Tel. Emerg:  5587654321               │   │
│  │  Confirmación: #1001                    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     TU PASE DE CHECK-IN                 │   │
│  │                                         │   │
│  │         [QR CODE IMAGE]                 │   │
│  │                                         │   │
│  │     DHMEX-GTO-AB12CD34                  │   │
│  │                                         │   │
│  │  Presenta este código el día del evento │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Tu inscripción incluye:                        │
│  ✓ Puntos Campeonato Nacional                   │
│  ✓ Chip de Cronometraje                         │
│  ✓ Acceso a Práctica y Carrera                  │
│  ✓ Más de $100,000 MXN en premios              │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  MECÁNICA NEUTRAL SHIMANO               │   │
│  │  Técnicos certificados durante todo     │   │
│  │  el evento para soporte mecánico.       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Obligatorio:                                   │
│  • Casco full face                              │
│  • Guantes                                      │
│  • Rodilleras                                   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  ¡Síguenos en Instagram!                │   │
│  │  [@dhmex_races]                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ¡Te esperamos en la pista!                     │
│                                                 │
│  [LOGOS PATROCINADORES]                         │
│  Scott | Shimano | SRAM | Motul | Red Bull     │
│  Schwalbe | Fox | Giro | Vittoria | Lazer      │
│                                                 │
│  $530,000 MXN en premios • 5 sedes • 13 cats   │
│  endhurorace.com                                │
└─────────────────────────────────────────────────┘
```

---

## Estructura de Archivos

```
DHMEXRACES-theme/
│
├── README.md                           # Este archivo
├── .gitignore                          # Archivos ignorados por Git
│
├── docs/                               # 📚 Documentación detallada
│   ├── SHOPIFY-THEME.md               # Guía del tema Shopify
│   ├── WEBHOOKS-API.md                # Referencia de la API
│   ├── METAFIELDS.md                  # Configuración de metafields
│   ├── GOOGLE-SHEETS.md               # Setup de Google Sheets
│   └── DEPLOYMENT.md                  # Guía de deployment
│
├── dhmexraces-custom/                  # 🛍️ Tema Shopify
│   │
│   ├── assets/                         # Recursos estáticos
│   │   ├── critical.css               # CSS crítico inline
│   │   ├── dhmexraces-logo.png        # Logo principal
│   │   ├── icon-account.svg           # Icono cuenta
│   │   ├── icon-cart.svg              # Icono carrito
│   │   └── shoppy-x-ray.svg           # Icono debug
│   │
│   ├── blocks/                         # Bloques reutilizables
│   │   ├── group.liquid               # Bloque grupo
│   │   └── text.liquid                # Bloque texto
│   │
│   ├── config/                         # Configuración del tema
│   │   ├── settings_data.json         # Valores actuales
│   │   └── settings_schema.json       # Esquema de settings
│   │
│   ├── layout/                         # Layouts base
│   │   ├── password.liquid            # Layout contraseña
│   │   └── theme.liquid               # Layout principal
│   │
│   ├── locales/                        # Traducciones
│   │   ├── en.default.json            # Inglés (default)
│   │   └── en.default.schema.json     # Schema traducciones
│   │
│   ├── sections/                       # ⭐ Secciones del tema
│   │   │
│   │   │── product.liquid             # 🎯 PÁGINA DE INSCRIPCIÓN
│   │   │                              #    - FOMO badges
│   │   │                              #    - Precios dinámicos
│   │   │                              #    - Countdown evento
│   │   │                              #    - Selector categorías
│   │   │                              #    - Formulario inscripción
│   │   │
│   │   ├── race-registration.liquid   # Cards de categorías (home)
│   │   ├── race-registration-guanajuato.liquid
│   │   ├── race-registration-puebla.liquid
│   │   ├── race-registration-guadalajara.liquid
│   │   │
│   │   ├── ranking.liquid             # Tabla de posiciones
│   │   ├── ranking-2025.liquid        # Ranking 2025
│   │   ├── ranking-overall.liquid     # Ranking general
│   │   ├── ranking-overall-2025.liquid
│   │   │
│   │   ├── kit-rider.liquid           # Beneficios inscripción
│   │   ├── sponsors.liquid            # Patrocinadores
│   │   ├── sponsor-contributions.liquid
│   │   ├── brand-showcase.liquid      # Showcase marcas
│   │   │
│   │   ├── hero-video.liquid          # Banner con video
│   │   ├── race-dates.liquid          # Fechas de carreras
│   │   │
│   │   ├── header.liquid              # Header/navegación
│   │   ├── header-group.json          # Config header
│   │   ├── footer.liquid              # Footer
│   │   ├── footer-group.json          # Config footer
│   │   │
│   │   ├── cart.liquid                # Carrito
│   │   ├── cart-custom.liquid         # Carrito personalizado
│   │   │
│   │   ├── collection.liquid          # Página de colección
│   │   ├── collections.liquid         # Lista de colecciones
│   │   ├── page.liquid                # Página genérica
│   │   ├── article.liquid             # Artículo de blog
│   │   ├── blog.liquid                # Página de blog
│   │   ├── search.liquid              # Búsqueda
│   │   ├── 404.liquid                 # Error 404
│   │   ├── password.liquid            # Página contraseña
│   │   │
│   │   ├── registration-form.liquid   # Formulario legacy
│   │   ├── custom-section.liquid      # Sección custom
│   │   └── hello-world.liquid         # Sección de prueba
│   │
│   ├── snippets/                       # Fragmentos reutilizables
│   │   ├── css-variables.liquid       # Variables CSS
│   │   ├── meta-tags.liquid           # Tags SEO
│   │   ├── image.liquid               # Helper imágenes
│   │   └── aos-animations.liquid      # Animaciones scroll
│   │
│   ├── templates/                      # Templates JSON
│   │   │
│   │   ├── index.json                 # Home
│   │   ├── product.json               # Producto genérico
│   │   ├── product.inscripcion-guanajuato-2026.json  # ⭐ Inscripción GTO
│   │   ├── product.guanajuato.json    # Producto Guanajuato
│   │   │
│   │   ├── page.json                  # Página genérica
│   │   ├── page.kit-rider.json        # Kit del rider
│   │   ├── page.sponsors.json         # Patrocinadores
│   │   ├── page.patrocinadores.json   # Patrocinadores (ES)
│   │   ├── page.ranking.json          # Ranking
│   │   ├── page.ranking-2025.json     # Ranking 2025
│   │   ├── page.ranking-overall.json  # Ranking general
│   │   ├── page.ranking-overall-2025.json
│   │   ├── page.registration-form.json # Form inscripción
│   │   │
│   │   ├── collection.json            # Colección
│   │   ├── list-collections.json      # Lista colecciones
│   │   ├── cart.json                  # Carrito
│   │   ├── search.json                # Búsqueda
│   │   ├── blog.json                  # Blog
│   │   ├── article.json               # Artículo
│   │   ├── 404.json                   # Error 404
│   │   ├── password.json              # Contraseña
│   │   ├── gift_card.liquid           # Tarjeta regalo
│   │   │
│   │   └── customers/                 # Área de clientes
│   │       ├── login.liquid           # Login
│   │       └── register.liquid        # Registro
│   │
│   ├── .gitignore                     # Git ignore tema
│   ├── .shopifyignore                 # Shopify ignore
│   ├── .theme-check.yml               # Config linter
│   ├── .gitattributes                 # Atributos Git
│   │
│   ├── README.md                      # Readme del tema
│   ├── CHANGELOG.md                   # Historial cambios
│   ├── LICENSE.md                     # Licencia
│   ├── CODE_OF_CONDUCT.md             # Código conducta
│   ├── CONTRIBUTING.md                # Guía contribución
│   ├── CONFIRMACION-EMAILS.md         # Doc emails
│   │
│   ├── create-product.js              # Script crear producto
│   └── auto-push.sh                   # Script auto-push
│
├── dhmexraces-webhooks/                # 🔗 Servidor Webhooks
│   │
│   ├── api/                           # Endpoints serverless
│   │   ├── order-created.js           # ⭐ Webhook principal
│   │   │                              #    - Procesa pedidos
│   │   │                              #    - Genera QR
│   │   │                              #    - Guarda en Sheets
│   │   │                              #    - Envía emails
│   │   │
│   │   ├── inventory.js               # API inventario FOMO
│   │   │                              #    - Playeras disponibles
│   │   │                              #    - Medallas disponibles
│   │   │
│   │   ├── dashboard.js               # API dashboard staff
│   │   │                              #    - Total inscritos
│   │   │                              #    - Check-ins realizados
│   │   │                              #    - Stats por categoría
│   │   │
│   │   ├── check-in.js                # API check-in
│   │   │                              #    - Busca por QR
│   │   │                              #    - Marca como presente
│   │   │
│   │   ├── test.js                    # Health check
│   │   └── test-sheets.js             # Test conexión Sheets
│   │
│   ├── public/                        # Archivos públicos
│   │   ├── dashboard.html             # Dashboard web
│   │   └── staff.html                 # Página staff
│   │
│   ├── dashboard.html                 # Dashboard (copia)
│   ├── staff.html                     # Staff (copia)
│   ├── preview-email.html             # Preview de emails
│   ├── wallet-pass-preview.html       # Preview wallet pass
│   │
│   ├── test-webhook.js                # Script test webhook
│   │
│   ├── package.json                   # Dependencias Node
│   ├── package-lock.json              # Lock file
│   ├── vercel.json                    # Config Vercel
│   ├── .gitignore                     # Git ignore
│   └── README.md                      # Readme webhooks
│
└── excel-to-ranking-converter.html    # 🔧 Utilidad conversión
                                       #    Convierte Excel a JSON
                                       #    para tablas de ranking
```

---

## Inicio Rápido

### Prerrequisitos

```bash
# Verificar Node.js (requiere 18+)
node --version  # v18.x.x o superior

# Instalar Shopify CLI
npm install -g @shopify/cli

# Instalar Vercel CLI
npm install -g vercel

# Instalar GitHub CLI (opcional)
npm install -g gh
```

### 1. Clonar repositorio

```bash
git clone https://github.com/PRAZIS-TECHNOLOGIES/DHMEXRACES-SHOPIFY.git
cd DHMEXRACES-SHOPIFY
```

### 2. Configurar tema Shopify

```bash
cd dhmexraces-custom

# Conectar con tu tienda
shopify theme dev --store TU-TIENDA.myshopify.com

# Se abrirá navegador para autenticación
# Autoriza el acceso a la tienda
```

### 3. Configurar webhooks

```bash
cd ../dhmexraces-webhooks

# Instalar dependencias
npm install

# Configurar variables de entorno
vercel env add RESEND_API_KEY           # API key de Resend
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL  # Email cuenta servicio
vercel env add GOOGLE_PRIVATE_KEY       # Private key (con \n)

# Deploy
vercel --prod
```

### 4. Configurar webhook en Shopify

1. Ve a **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. Click **Create webhook**
3. Configurar:
   - **Event**: Order creation
   - **Format**: JSON
   - **URL**: `https://TU-PROYECTO.vercel.app/api/order-created`
4. Click **Save**

### 5. Verificar

```bash
# Test del servidor
curl https://TU-PROYECTO.vercel.app/api/test

# Test de inventario
curl https://TU-PROYECTO.vercel.app/api/inventory?sede=guanajuato
```

---

## Configuración Detallada

Ver documentación específica:

- **[📖 Tema Shopify](./docs/SHOPIFY-THEME.md)** - Secciones, CSS, JavaScript
- **[📖 Webhooks API](./docs/WEBHOOKS-API.md)** - Endpoints, payloads, respuestas
- **[📖 Metafields](./docs/METAFIELDS.md)** - Precios dinámicos, fechas
- **[📖 Google Sheets](./docs/GOOGLE-SHEETS.md)** - Setup cuenta servicio
- **[📖 Deployment](./docs/DEPLOYMENT.md)** - Guía paso a paso

---

## Variables de Entorno

### Vercel (Webhooks)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `RESEND_API_KEY` | API Key de Resend | `re_xxxxxxxxx` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email cuenta servicio | `xxx@proyecto.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Private key con `\n` | `-----BEGIN PRIVATE KEY-----\n...` |

### Cómo configurar

```bash
# Agregar variable
vercel env add NOMBRE_VARIABLE

# Ver variables configuradas
vercel env ls

# Eliminar variable
vercel env rm NOMBRE_VARIABLE
```

---

## Sedes del Campeonato

| # | Sede | Estado | Fecha | Pista |
|---|------|--------|-------|-------|
| 1 | **Guanajuato** | Activo | TBD 2026 | TBD |
| 2 | **Puebla** | Próximamente | TBD 2026 | TBD |
| 3 | **Guadalajara** | Próximamente | TBD 2026 | TBD |
| 4 | **Ixtapan** | Próximamente | TBD 2026 | TBD |
| 5 | **Taxco** | Próximamente | TBD 2026 | TBD |

---

## Categorías

### Categorías Elite (Premiación en efectivo)

| Categoría | Edad | Premio por sede |
|-----------|------|-----------------|
| Elite Hombres | 18+ | $36,000 MXN |
| Elite Mujeres | 18+ | $36,000 MXN |

### Categorías Amateur (Premiación en especie)

| Categoría | Edad | Premios |
|-----------|------|---------|
| Master 30+ Hombres | 30-39 | Productos patrocinadores |
| Master 30+ Mujeres | 30-39 | Productos patrocinadores |
| Veteranos 40+ Hombres | 40+ | Productos patrocinadores |
| Veteranos 40+ Mujeres | 40+ | Productos patrocinadores |
| Amateur Hombres | 18+ | Productos patrocinadores |
| Amateur Mujeres | 18+ | Productos patrocinadores |

### Categorías Juveniles

| Categoría | Edad | Premios |
|-----------|------|---------|
| Juvenil Hombres | 14-17 | Productos patrocinadores |
| Juvenil Mujeres | 14-17 | Productos patrocinadores |
| Infantil Hombres | 10-13 | Productos patrocinadores |
| Infantil Mujeres | 10-13 | Productos patrocinadores |

### Categoría Especial

| Categoría | Descripción | Premios |
|-----------|-------------|---------|
| Open Hardtail | Cualquier edad, bici rígida | Productos patrocinadores |

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Shopify** | 2.0 | E-commerce, checkout, productos |
| **Liquid** | - | Templates del tema |
| **JavaScript** | ES6+ | Interactividad frontend |
| **CSS** | 3 | Estilos, responsive |
| **Node.js** | 18+ | Runtime serverless |
| **Vercel** | - | Hosting serverless functions |
| **Google Sheets API** | v4 | Base de datos corredores |
| **google-spreadsheet** | 3.3.0 | Cliente Node para Sheets |
| **Resend** | 2.0.0 | Envío emails transaccionales |

---

## Documentación Adicional

| Documento | Descripción | Link |
|-----------|-------------|------|
| Tema Shopify | Secciones, CSS, JavaScript, desarrollo | [SHOPIFY-THEME.md](./docs/SHOPIFY-THEME.md) |
| Webhooks API | Endpoints, payloads, respuestas, errores | [WEBHOOKS-API.md](./docs/WEBHOOKS-API.md) |
| Metafields | Precios dinámicos, fases, countdown | [METAFIELDS.md](./docs/METAFIELDS.md) |
| Google Sheets | Setup cuenta servicio, estructura | [GOOGLE-SHEETS.md](./docs/GOOGLE-SHEETS.md) |
| Deployment | Guía paso a paso, troubleshooting | [DEPLOYMENT.md](./docs/DEPLOYMENT.md) |

---

## Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Add nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## Soporte

- **Email**: contacto@dhmexraces.com
- **Instagram**: [@dhmex_races](https://instagram.com/dhmex_races)
- **Web**: [endhurorace.com](https://endhurorace.com)

---

## Licencia

Este proyecto es propietario de DHMEXRACES. Todos los derechos reservados.

---

<div align="center">

**DHMEXRACES 2026**

*El campeonato nacional de downhill MTB más grande de México*

**$530,000 MXN en premios • 5 sedes • 13 categorías**

[endhurorace.com](https://endhurorace.com) • [@dhmex_races](https://instagram.com/dhmex_races)

</div>
