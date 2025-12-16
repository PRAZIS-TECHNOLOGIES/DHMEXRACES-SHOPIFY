# Tema Shopify - DHMEXRACES Custom

Documentación completa del tema personalizado de Shopify para el sistema de inscripciones de DHMEXRACES.

## Estructura del Tema

```
dhmexraces-custom/
├── assets/                     # Recursos estáticos
│   └── dhmexraces-logo.png
├── blocks/                     # Bloques reutilizables
│   ├── group.liquid
│   └── text.liquid
├── config/                     # Configuración
│   ├── settings_data.json      # Valores actuales
│   └── settings_schema.json    # Esquema de configuración
├── layout/                     # Layouts base
│   ├── password.liquid
│   └── theme.liquid            # Layout principal
├── locales/                    # Traducciones
│   ├── en.default.json
│   └── en.default.schema.json
├── sections/                   # ⭐ Secciones del tema
├── snippets/                   # Fragmentos reutilizables
└── templates/                  # Templates JSON
```

## Secciones Principales

### 1. `product.liquid` - Página de Inscripción

**Ubicación**: `sections/product.liquid`

Esta es la sección más importante del tema. Maneja todo el flujo de inscripción.

#### Características:

- **FOMO Badges**: Muestra disponibilidad de playeras (50 primeros) y medallas (100 primeros)
- **Precios Dinámicos**: Cambia automáticamente según fases configuradas en metafields
- **Countdown**: Contador regresivo hasta el evento
- **Selector de Categorías**: Grid de variantes para seleccionar categoría
- **Formulario de Inscripción**: Datos personales, equipo, contacto de emergencia
- **Responsive**: Optimizado para móvil y desktop

#### Estructura HTML:

```liquid
<!-- FOMO Badges -->
<div class="product__fomo-badges">
  <div class="product__fomo-badge product__fomo-badge--playeras">
    <span class="product__fomo-icon">👕</span>
    <div class="product__fomo-content">
      <span class="product__fomo-title">Playeras disponibles</span>
      <span class="product__fomo-value" id="playerasDisponibles">--</span>
    </div>
  </div>
  <!-- Similar para medallas -->
</div>

<!-- Price Card -->
<div class="product__price-card product__price-card--dynamic">
  <div class="product__price-phase">
    <span class="product__phase-badge" id="phaseBadge">Cargando...</span>
    <div class="product__price-label">Precio por inscripción</div>
  </div>
  <div class="product__price-wrapper">
    <div class="product__price" id="productPrice">{{ price }}</div>
    <span class="product__price-currency">MXN</span>
  </div>
</div>

<!-- Countdown al evento -->
<div class="product__event-countdown" id="eventCountdown">
  <span>Faltan <strong id="eventDays">--</strong>d
  <strong id="eventHours">--</strong>h
  <strong id="eventMinutes">--</strong>m</span>
</div>

<!-- Selector de Categorías -->
<div class="product__categories">
  {% for variant in product.variants %}
    <button class="product__category" data-variant-id="{{ variant.id }}">
      {{ variant.title }}
    </button>
  {% endfor %}
</div>

<!-- Formulario de Inscripción -->
<form id="registrationForm">
  <input name="nombre" required>
  <input name="email" type="email" required>
  <input name="telefono" type="tel" required>
  <input name="fecha_nacimiento" type="date" required>
  <input name="equipo">
  <input name="emergencia_nombre" required>
  <input name="emergencia_telefono" required>
</form>
```

#### JavaScript Clave:

```javascript
// Configuración desde metafields
const sedeConfig = JSON.parse(document.getElementById('sedeConfig').textContent);

// Fetch inventario desde API
async function fetchInventory() {
  const response = await fetch(`${sedeConfig.apiUrl}?sede=${sedeName}`);
  const data = await response.json();

  // Actualizar badges FOMO
  document.getElementById('playerasDisponibles').textContent = data.playeras.disponibles;
  document.getElementById('medallasDisponibles').textContent = data.medallas.disponibles;
}

// Precios dinámicos por fases
function updatePricing() {
  const now = new Date();
  const phases = [
    { end: sedeConfig.phase1End, price: sedeConfig.phase1Price, label: sedeConfig.phase1Label },
    { end: sedeConfig.phase2End, price: sedeConfig.phase2Price, label: sedeConfig.phase2Label },
    { end: sedeConfig.phase3End, price: sedeConfig.phase3Price, label: sedeConfig.phase3Label },
  ];

  for (const phase of phases) {
    if (now < new Date(phase.end)) {
      document.getElementById('phaseBadge').textContent = phase.label;
      document.getElementById('productPrice').textContent = `$${phase.price}`;
      break;
    }
  }
}

// Formulario de inscripción
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const registrationData = {
    registrations: [{
      nombre: form.nombre.value,
      email: form.email.value,
      telefono: form.telefono.value,
      fecha_nacimiento: form.fecha_nacimiento.value,
      equipo: form.equipo.value || 'Independiente',
      emergencia_nombre: form.emergencia_nombre.value,
      emergencia_telefono: form.emergencia_telefono.value,
      variant_id: selectedVariant.id,
      variant_title: selectedVariant.title,
      product_title: product.title,
      categoria: selectedVariant.title
    }],
    timestamp: new Date().toISOString()
  };

  // Guardar en cart attributes
  await fetch('/cart/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attributes: {
        registration_data: JSON.stringify(registrationData)
      }
    })
  });

  // Agregar al carrito
  await fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: selectedVariant.id,
      quantity: 1
    })
  });

  window.location.href = '/cart';
});
```

### 2. `race-registration.liquid` - Cards de Categorías

**Ubicación**: `sections/race-registration.liquid`

Muestra las categorías disponibles en la página principal.

#### Schema:

```json
{
  "name": "Race Registration",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Title",
      "default": "Inscripciones"
    },
    {
      "type": "product",
      "id": "product",
      "label": "Product",
      "info": "Select the product with multiple variants (categories)"
    },
    {
      "type": "range",
      "id": "image_position_x",
      "min": 0,
      "max": 100,
      "label": "Posición Horizontal"
    }
  ]
}
```

### 3. `ranking.liquid` - Tabla de Posiciones

Muestra el ranking de corredores por categoría.

### 4. `kit-rider.liquid` - Beneficios

Lista de lo que incluye la inscripción:
- Medalla conmemorativa (100 primeros)
- Playera oficial (50 primeros)
- Chip de cronometraje
- Race plate
- Fotografía profesional
- Servicio médico
- Mecánica neutral Shimano
- Cerveza de cortesía

### 5. `sponsors.liquid` - Patrocinadores

Grid de logos de patrocinadores organizados por tier:
- Oro: Scott, Shimano
- Plata: SRAM, Motul
- Bronce: Red Bull, Schwalbe, Fox, Giro, etc.

### 6. `hero-video.liquid` - Banner Principal

Video de fondo con overlay y call-to-action.

### 7. `header.liquid` - Navegación

Header con logo, menú y carrito.

### 8. `footer.liquid` - Pie de Página

Links, redes sociales e información de contacto.

## Templates

### `product.inscripcion-guanajuato-2026.json`

Template específico para el producto de inscripción a Guanajuato:

```json
{
  "sections": {
    "main": {
      "type": "product",
      "settings": {}
    }
  },
  "order": ["main"]
}
```

### `page.kit-rider.json`

Template para la página de beneficios del kit:

```json
{
  "sections": {
    "main": {
      "type": "kit-rider",
      "blocks": {
        "block_medalla": { "type": "item", "settings": {...} },
        "block_playera": { "type": "item", "settings": {...} },
        ...
      }
    }
  }
}
```

## CSS Variables

El tema usa CSS variables para consistencia:

```css
:root {
  --color-primary: #E42C2C;      /* Rojo DHMEXRACES */
  --color-secondary: #0066B3;    /* Azul Shimano */
  --color-gold: #FFD700;         /* Dorado badges */
  --color-success: #22C55E;      /* Verde checks */
  --color-error: #EF4444;        /* Rojo errores */
  --color-background: #000000;   /* Negro fondo */
  --color-surface: #1A1A1A;      /* Gris superficie */
  --color-text: #FFFFFF;         /* Blanco texto */
  --color-text-muted: rgba(255,255,255,0.6);
}
```

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) { ... }

/* Tablet */
@media (max-width: 968px) { ... }

/* Desktop */
@media (min-width: 969px) { ... }
```

## Snippets

### `css-variables.liquid`

Define las variables CSS globales.

### `meta-tags.liquid`

Tags SEO y Open Graph.

### `image.liquid`

Helper para imágenes responsivas.

### `aos-animations.liquid`

Animaciones de scroll (Animate On Scroll).

## Desarrollo Local

### Iniciar servidor de desarrollo:

```bash
cd dhmexraces-custom
shopify theme dev --store tu-tienda.myshopify.com
```

### Push cambios a producción:

```bash
shopify theme push --live --allow-live
```

### Push solo una sección:

```bash
shopify theme push --only sections/product.liquid --live --allow-live
```

## Personalización

### Cambiar colores

Editar `snippets/css-variables.liquid`:

```liquid
:root {
  --color-primary: #TU_COLOR;
}
```

### Agregar nueva sede

1. Crear producto en Shopify con variantes (categorías)
2. Crear template: `templates/product.inscripcion-nueva-sede.json`
3. Asignar template al producto
4. Configurar metafields de precios y fechas

### Modificar formulario

Editar `sections/product.liquid`, buscar `#registrationForm`:

```html
<!-- Agregar nuevo campo -->
<div class="form-field">
  <label for="nuevo_campo">Nuevo Campo</label>
  <input type="text" name="nuevo_campo" id="nuevo_campo">
</div>
```

Actualizar JavaScript para incluir el nuevo campo en `registrationData`.

## Troubleshooting

### El formulario no guarda datos

1. Verificar que `registration_data` se guarde en cart attributes
2. Revisar consola del navegador por errores
3. Verificar que el webhook esté configurado en Shopify

### FOMO badges muestran "--"

1. Verificar URL de la API en `sedeConfig`
2. Revisar que la API responda correctamente
3. Verificar permisos CORS

### Countdown no aparece

1. Verificar que los metafields `event_date` estén configurados
2. Revisar formato de fecha (ISO 8601)
3. Verificar IDs únicos (`eventDays`, `eventHours`, etc.)

### Precios no cambian

1. Verificar metafields de fases (`phase1_price`, `phase1_end`, etc.)
2. Verificar que `pricing_enabled` sea `true`
3. Revisar lógica de fechas en JavaScript
