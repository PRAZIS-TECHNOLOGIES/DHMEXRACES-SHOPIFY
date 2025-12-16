# Tema Shopify - DHMEXRACES Custom

Documentación técnica completa del tema personalizado de Shopify para el sistema de inscripciones de DHMEXRACES.

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Estructura del Tema](#estructura-del-tema)
3. [Sección Principal: product.liquid](#sección-principal-productliquid)
4. [Sistema de Precios Dinámicos](#sistema-de-precios-dinámicos)
5. [Sistema FOMO](#sistema-fomo)
6. [Countdown al Evento](#countdown-al-evento)
7. [Formulario de Inscripción](#formulario-de-inscripción)
8. [CSS Variables y Diseño](#css-variables-y-diseño)
9. [JavaScript Completo](#javascript-completo)
10. [Templates JSON](#templates-json)
11. [Otras Secciones](#otras-secciones)
12. [Desarrollo Local](#desarrollo-local)
13. [Personalización](#personalización)
14. [Troubleshooting](#troubleshooting)

---

## Visión General

El tema DHMEXRACES está basado en **Shopify 2.0** y está diseñado específicamente para la venta de inscripciones a carreras de downhill MTB. Características principales:

| Característica | Descripción |
|----------------|-------------|
| **Precios Dinámicos** | Cambian automáticamente según la fase (Early Bird, Regular, Late) |
| **FOMO Inventory** | Muestra playeras y medallas disponibles en tiempo real |
| **Countdown** | Cuenta regresiva hasta el evento |
| **Formulario Integrado** | Captura datos del corredor antes de agregar al carrito |
| **Responsive** | Optimizado para móvil y desktop |
| **Dark Theme** | Diseño oscuro con acentos rojos (#E42C2C) |

---

## Estructura del Tema

```
dhmexraces-custom/
│
├── assets/                         # 📦 Recursos estáticos
│   ├── critical.css               # CSS crítico (inline en head)
│   ├── dhmexraces-logo.png        # Logo oficial 600x200
│   ├── icon-account.svg           # Icono de cuenta
│   ├── icon-cart.svg              # Icono de carrito
│   └── shoppy-x-ray.svg           # Icono debug Shopify
│
├── blocks/                         # 🧩 Bloques reutilizables
│   ├── group.liquid               # Bloque para agrupar contenido
│   └── text.liquid                # Bloque de texto simple
│
├── config/                         # ⚙️ Configuración
│   ├── settings_data.json         # Valores actuales de settings
│   └── settings_schema.json       # Esquema de configuración del tema
│
├── layout/                         # 📐 Layouts base
│   ├── password.liquid            # Layout para página de contraseña
│   └── theme.liquid               # Layout principal (head, body, footer)
│
├── locales/                        # 🌍 Traducciones
│   ├── en.default.json            # Inglés (default)
│   └── en.default.schema.json     # Schema de traducciones
│
├── sections/                       # ⭐ SECCIONES DEL TEMA
│   │
│   │── product.liquid             # 🎯 PÁGINA DE INSCRIPCIÓN PRINCIPAL
│   │                              # • FOMO badges (playeras/medallas)
│   │                              # • Precios dinámicos por fases
│   │                              # • Countdown al evento
│   │                              # • Selector de categorías (variantes)
│   │                              # • Formulario de inscripción
│   │                              # • Responsive mobile-first
│   │
│   ├── race-registration.liquid   # Cards de inscripción (home)
│   ├── race-registration-guanajuato.liquid
│   ├── race-registration-puebla.liquid
│   ├── race-registration-guadalajara.liquid
│   │
│   ├── ranking.liquid             # Tabla de posiciones
│   ├── ranking-2025.liquid
│   ├── ranking-overall.liquid
│   ├── ranking-overall-2025.liquid
│   │
│   ├── kit-rider.liquid           # Beneficios de inscripción
│   ├── sponsors.liquid            # Grid de patrocinadores
│   ├── sponsor-contributions.liquid
│   ├── brand-showcase.liquid
│   │
│   ├── hero-video.liquid          # Banner con video
│   ├── race-dates.liquid          # Fechas de carreras
│   │
│   ├── header.liquid              # Header/navegación
│   ├── header-group.json
│   ├── footer.liquid              # Footer
│   ├── footer-group.json
│   │
│   ├── cart.liquid                # Carrito estándar
│   ├── cart-custom.liquid         # Carrito personalizado
│   │
│   ├── collection.liquid          # Página de colección
│   ├── collections.liquid         # Lista de colecciones
│   ├── page.liquid                # Página genérica
│   ├── article.liquid             # Artículo de blog
│   ├── blog.liquid                # Página de blog
│   ├── search.liquid              # Búsqueda
│   ├── 404.liquid                 # Error 404
│   ├── password.liquid            # Página contraseña
│   │
│   ├── registration-form.liquid   # Formulario legacy
│   ├── custom-section.liquid      # Sección custom
│   └── hello-world.liquid         # Sección de prueba
│
├── snippets/                       # 🧩 Fragmentos reutilizables
│   ├── css-variables.liquid       # Variables CSS globales
│   ├── meta-tags.liquid           # SEO meta tags
│   ├── image.liquid               # Helper para imágenes responsivas
│   └── aos-animations.liquid      # Animaciones scroll (AOS)
│
├── templates/                      # 📄 Templates JSON
│   │
│   ├── index.json                 # Home
│   ├── product.json               # Producto genérico
│   ├── product.inscripcion-guanajuato-2026.json  # ⭐ Template inscripción
│   ├── product.guanajuato.json
│   │
│   ├── page.json                  # Página genérica
│   ├── page.kit-rider.json
│   ├── page.sponsors.json
│   ├── page.patrocinadores.json
│   ├── page.ranking.json
│   ├── page.ranking-2025.json
│   ├── page.ranking-overall.json
│   ├── page.ranking-overall-2025.json
│   ├── page.registration-form.json
│   │
│   ├── collection.json
│   ├── list-collections.json
│   ├── cart.json
│   ├── search.json
│   ├── blog.json
│   ├── article.json
│   ├── 404.json
│   ├── password.json
│   ├── gift_card.liquid
│   │
│   └── customers/                 # Área de clientes
│       ├── login.liquid
│       └── register.liquid
│
├── .gitignore
├── .shopifyignore                 # Archivos ignorados por Shopify CLI
├── .theme-check.yml               # Configuración del linter
├── README.md
├── CHANGELOG.md
├── LICENSE.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── CONFIRMACION-EMAILS.md
│
├── create-product.js              # Script para crear productos
└── auto-push.sh                   # Script de auto-deploy
```

---

## Sección Principal: product.liquid

Esta es la sección más importante del tema. Maneja todo el flujo de inscripción.

### Ubicación
`sections/product.liquid`

### Estructura HTML Completa

```liquid
{% comment %}
  Product page for DHMEXRACES race registrations - Professional Design
{% endcomment %}

<section class="product">
  <div class="product__container">

    {%- comment -%} Product Gallery {%- endcomment -%}
    <div class="product__gallery">
      {% if product.images.size > 0 %}
        <div class="product__main-image">
          <img
            src="{{ product.featured_image | image_url: width: 1200 }}"
            alt="{{ product.title }}"
            id="mainProductImage"
            class="product__image"
            width="1200"
            height="800">
        </div>

        {% if product.images.size > 1 %}
          <div class="product__thumbnails">
            {% for image in product.images %}
              <button
                type="button"
                class="product__thumbnail {% if forloop.first %}active{% endif %}"
                data-image="{{ image | image_url: width: 1200 }}"
                onclick="changeMainImage(this)">
                <img src="{{ image | image_url: width: 200 }}" alt="{{ product.title }}">
              </button>
            {% endfor %}
          </div>
        {% endif %}
      {% else %}
        <div class="product__placeholder">
          <span>{{ product.title }}</span>
        </div>
      {% endif %}
    </div>

    {%- comment -%} Product Info & Form {%- endcomment -%}
    <div class="product__info">

      {%- comment -%} Race Badge {%- endcomment -%}
      {% if product.metafields.custom.race_round != blank %}
        <div class="product__badge">
          {{ product.metafields.custom.race_round }}
        </div>
      {% endif %}

      {%- comment -%} Title {%- endcomment -%}
      <h1 class="product__title">{{ product.title }}</h1>

      {%- comment -%} Race Details (date, location) {%- endcomment -%}
      {% if product.metafields.custom.race_date != blank %}
        <div class="product__details">
          <div class="product__detail">
            <svg><!-- calendar icon --></svg>
            <span>{{ product.metafields.custom.race_date }}</span>
          </div>
          <div class="product__detail">
            <svg><!-- location icon --></svg>
            <span>{{ product.metafields.custom.race_location }}</span>
          </div>
        </div>
      {% endif %}

      {%- comment -%} Description {%- endcomment -%}
      <div class="product__description">
        {{ product.description }}
      </div>

      {%- comment -%} FOMO Inventory Badges {%- endcomment -%}
      <div class="product__fomo-container" id="fomoContainer" style="display: none;">
        <!-- Playeras badge -->
        <!-- Medallas badge -->
      </div>

      {%- comment -%} Price Card (dynamic or static) {%- endcomment -%}
      {% if product.metafields.custom.pricing_enabled %}
        <!-- Dynamic pricing with phases -->
      {% else %}
        <!-- Standard price -->
      {% endif %}

      {%- comment -%} Event Countdown {%- endcomment -%}
      <div class="product__event-countdown" id="eventCountdown">
        <!-- Countdown timer -->
      </div>

      {%- comment -%} Registration Form {%- endcomment -%}
      {% form 'product', product %}
        <!-- Category selector -->
        <!-- Quantity selector -->
        <!-- Submit button -->
        <!-- Benefits list -->
      {% endform %}

    </div>
  </div>
</section>
```

### Configuración JSON (sedeConfig)

Este script pasa la configuración del producto desde Liquid a JavaScript:

```liquid
<script id="sedeConfig" type="application/json">
  {
    "productTitle": {{ product.title | json }},
    "apiUrl": "https://dhmexraces-webhooks.vercel.app/api/inventory",
    "eventDate": "{{ product.metafields.custom.event_date | date: '%Y-%m-%dT%H:%M:%S' }}",
    "eventDateLabel": {{ product.metafields.custom.event_date_label | default: "" | json }},
    "closeDate": "{{ product.metafields.custom.close_date | date: '%Y-%m-%dT%H:%M:%S' }}"
  }
</script>
```

### Configuración de Precios (pricingConfig)

```liquid
<script id="pricingConfig" type="application/json">
  {
    "enabled": true,
    "phases": [
      {
        "start": "{{ product.metafields.custom.phase1_start }}",
        "end": "{{ product.metafields.custom.phase1_end }}",
        "price": {{ product.metafields.custom.phase1_price | default: 0 }},
        "label": "{{ product.metafields.custom.phase1_label | default: 'Early Bird' }}"
      },
      {
        "start": "{{ product.metafields.custom.phase2_start }}",
        "end": "{{ product.metafields.custom.phase2_end }}",
        "price": {{ product.metafields.custom.phase2_price | default: 0 }},
        "label": "{{ product.metafields.custom.phase2_label | default: 'Normal' }}"
      },
      {
        "start": "{{ product.metafields.custom.phase3_start }}",
        "end": "{{ product.metafields.custom.phase3_end }}",
        "price": {{ product.metafields.custom.phase3_price | default: 0 }},
        "label": "{{ product.metafields.custom.phase3_label | default: 'Último Momento' }}"
      }
    ]
  }
</script>
```

---

## Sistema de Precios Dinámicos

El sistema de precios dinámicos permite configurar 3 fases de precios que cambian automáticamente según la fecha.

### Cómo Funciona

1. **Metafields**: Los precios y fechas se configuran en metafields del producto
2. **Liquid**: Lee los metafields y los pasa a JavaScript via JSON
3. **JavaScript**: Determina la fase actual y actualiza el UI

### JavaScript de Precios Dinámicos

```javascript
function initDynamicPricing() {
  const configEl = document.getElementById('pricingConfig');
  if (!configEl) return;

  try {
    const config = JSON.parse(configEl.textContent);
    if (!config.enabled) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtrar fases válidas (con fechas y precios)
    const validPhases = config.phases.filter(p => p.start && p.end && p.price > 0);
    if (validPhases.length === 0) return;

    // Encontrar fase actual
    let currentPhase = null;
    let currentPhaseIndex = -1;

    for (let i = 0; i < validPhases.length; i++) {
      const phase = validPhases[i];
      const startDate = new Date(phase.start);
      const endDate = new Date(phase.end);

      if (today >= startDate && today <= endDate) {
        currentPhase = phase;
        currentPhaseIndex = i;
        break;
      }
    }

    // Actualizar UI
    const priceEl = document.getElementById('productPrice');
    const badgeEl = document.getElementById('phaseBadge');
    const countdownEl = document.getElementById('priceCountdown');
    const nextPriceEl = document.getElementById('nextPrice');
    const countdownDaysEl = document.getElementById('countdownDays');

    if (currentPhase) {
      // Actualizar precio mostrado
      priceEl.textContent = '$' + currentPhase.price.toLocaleString('es-MX');
      badgeEl.textContent = currentPhase.label;

      // Marcar fases en la línea de tiempo
      document.querySelectorAll('.product__timeline-phase').forEach((el, idx) => {
        if (idx < currentPhaseIndex) {
          el.classList.add('past');
        } else if (idx === currentPhaseIndex) {
          el.classList.add('current');
        }
      });

      // Mostrar countdown si hay una fase siguiente
      if (currentPhaseIndex < validPhases.length - 1) {
        const nextPhase = validPhases[currentPhaseIndex + 1];
        const endDate = new Date(currentPhase.end);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft > 0 && daysLeft <= 30) {
          nextPriceEl.textContent = '$' + nextPhase.price.toLocaleString('es-MX');
          countdownDaysEl.textContent = daysLeft;
          countdownEl.style.display = 'flex';
        }
      }
    }
  } catch (e) {
    console.error('Error initializing dynamic pricing:', e);
  }
}
```

### Línea de Tiempo Visual

```html
<div class="product__price-timeline" id="priceTimeline">
  <div class="product__timeline-phase" data-phase="1">
    <div class="product__timeline-dot"></div>
    <div class="product__timeline-info">
      <span class="product__timeline-label">Early Bird</span>
      <span class="product__timeline-price">$1,200</span>
    </div>
  </div>
  <div class="product__timeline-phase current" data-phase="2">
    <div class="product__timeline-dot"></div>
    <div class="product__timeline-info">
      <span class="product__timeline-label">Normal</span>
      <span class="product__timeline-price">$1,350</span>
    </div>
  </div>
  <div class="product__timeline-phase" data-phase="3">
    <div class="product__timeline-dot"></div>
    <div class="product__timeline-info">
      <span class="product__timeline-label">Último Momento</span>
      <span class="product__timeline-price">$1,500</span>
    </div>
  </div>
</div>
```

---

## Sistema FOMO

El sistema FOMO (Fear Of Missing Out) muestra en tiempo real la disponibilidad de playeras y medallas.

### Límites Configurados

| Item | Límite | Descripción |
|------|--------|-------------|
| Playeras | 50 | Solo los primeros 50 inscritos |
| Medallas | 100 | Solo los primeros 100 inscritos |

### JavaScript FOMO

```javascript
async function initFomoInventory() {
  const configEl = document.getElementById('sedeConfig');
  if (!configEl) return;

  try {
    const config = JSON.parse(configEl.textContent);
    const productTitle = config.productTitle.toLowerCase();

    // Detectar sede del título del producto
    let sede = null;
    if (productTitle.includes('guanajuato')) sede = 'guanajuato';
    else if (productTitle.includes('puebla')) sede = 'puebla';
    else if (productTitle.includes('guadalajara')) sede = 'guadalajara';
    else if (productTitle.includes('ixtapan')) sede = 'ixtapan';
    else if (productTitle.includes('taxco')) sede = 'taxco';

    if (!sede) {
      console.log('FOMO: No sede detected in product title');
      return;
    }

    // Fetch datos de inventario desde la API de Vercel
    const response = await fetch(`${config.apiUrl}?sede=${sede}`);
    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    // Referencias a elementos del DOM
    const container = document.getElementById('fomoContainer');
    const playerasEl = document.getElementById('fomoPlayeras');
    const medallasEl = document.getElementById('fomoMedallas');
    const playerasValueEl = document.getElementById('fomoPlayerasValue');
    const medallasValueEl = document.getElementById('fomoMedallasValue');

    // Actualizar Playeras (primeros 50)
    if (data.playeras.agotadas) {
      playerasValueEl.textContent = 'Agotadas (0 de 50)';
      playerasEl.classList.add('product__fomo-badge--agotado');
    } else if (data.playeras.disponibles <= 10) {
      playerasValueEl.textContent = `¡Quedan ${data.playeras.disponibles} de ${data.playeras.total}!`;
      playerasEl.classList.add('product__fomo-badge--urgente');
    } else {
      playerasValueEl.textContent = `${data.playeras.disponibles} de ${data.playeras.total} disponibles`;
    }

    // Actualizar Medallas (primeros 100)
    if (data.medallas.agotadas) {
      medallasValueEl.textContent = 'Agotadas (0 de 100)';
      medallasEl.classList.add('product__fomo-badge--agotado');
    } else if (data.medallas.disponibles <= 20) {
      medallasValueEl.textContent = `¡Quedan ${data.medallas.disponibles} de ${data.medallas.total}!`;
      medallasEl.classList.add('product__fomo-badge--urgente');
    } else {
      medallasValueEl.textContent = `${data.medallas.disponibles} de ${data.medallas.total} disponibles`;
    }

    // Mostrar container
    container.style.display = 'flex';

    // Contador de inscritos (aparece desde 61+)
    const inscritos = data.inscritos || 0;
    const MAX_CUPO = 150;
    const SHOW_COUNT_THRESHOLD = 61;
    const SHOW_PROGRESS_THRESHOLD = 100;

    if (inscritos >= SHOW_COUNT_THRESHOLD) {
      document.getElementById('fomoInscritosNumber').textContent = inscritos;
      document.getElementById('fomoInscritos').style.display = 'block';

      // Barra de progreso (aparece desde 100+)
      if (inscritos >= SHOW_PROGRESS_THRESHOLD) {
        const percentage = Math.min(Math.round((inscritos / MAX_CUPO) * 100), 100);
        document.getElementById('fomoProgressFill').style.width = `${percentage}%`;
        document.getElementById('fomoProgressText').textContent = `${percentage}% del cupo`;
        document.getElementById('fomoProgress').style.display = 'flex';
      }
    }

  } catch (e) {
    console.error('Error loading FOMO inventory:', e);
    document.getElementById('fomoContainer').style.display = 'none';
  }
}
```

### Estados Visuales FOMO

| Estado | Clase CSS | Descripción |
|--------|-----------|-------------|
| Normal | (ninguna) | Disponibilidad normal |
| Urgente | `--urgente` | Quedan pocos (< 10 playeras, < 20 medallas) |
| Agotado | `--agotado` | No quedan disponibles |

---

## Countdown al Evento

Muestra una cuenta regresiva hasta la fecha del evento, configurada via metafields.

### JavaScript del Countdown

```javascript
function initEventCountdown() {
  const configEl = document.getElementById('sedeConfig');
  if (!configEl) return;

  try {
    const config = JSON.parse(configEl.textContent);

    // Verificar fecha de evento configurada
    if (!config.eventDate || config.eventDate === '' || config.eventDate === 'null') {
      return;
    }

    const eventDate = new Date(config.eventDate);
    if (isNaN(eventDate.getTime())) return;

    const eventLabel = config.eventDateLabel || '';
    const now = new Date();

    // Verificar fecha de cierre
    if (config.closeDate && config.closeDate !== '') {
      const closeDate = new Date(config.closeDate);

      if (!isNaN(closeDate.getTime()) && now > closeDate) {
        // Inscripciones cerradas
        document.getElementById('registrationClosed').style.display = 'flex';
        document.getElementById('eventCountdown').style.display = 'none';

        // Deshabilitar formulario
        const submitBtn = document.querySelector('.product__submit');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Inscripciones Cerradas';
        }
        return;
      }
    }

    // Mostrar countdown
    document.getElementById('eventCountdown').style.display = 'flex';
    if (eventLabel) {
      document.getElementById('eventDateLabel').textContent = '· ' + eventLabel;
    }

    function updateCountdown() {
      const now = new Date();
      const diff = eventDate - now;

      if (diff <= 0) {
        document.getElementById('eventCountdown').innerHTML = `
          <div class="product__event-countdown-inner">
            <span class="product__event-countdown-live">🏁 Evento en curso</span>
          </div>
        `;
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById('eventDays').textContent = days;
      document.getElementById('eventHours').textContent = hours.toString().padStart(2, '0');
      document.getElementById('eventMinutes').textContent = minutes.toString().padStart(2, '0');
      document.getElementById('eventSeconds').textContent = seconds.toString().padStart(2, '0');

      // Urgencia si quedan menos de 7 días
      if (days < 7) {
        document.getElementById('eventCountdown').classList.add('product__event-countdown--urgente');
      }
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);

  } catch (e) {
    console.error('Error en countdown:', e);
  }
}
```

---

## Formulario de Inscripción

El formulario captura los datos del corredor y los guarda en `cart attributes` para que el webhook los procese después del pago.

### HTML del Formulario

```liquid
{% form 'product', product, class: 'product__form' %}
  {% assign current_variant = product.selected_or_first_available_variant %}

  {%- comment -%} Category Selector {%- endcomment -%}
  {% if product.variants.size > 1 %}
    <div class="product__field">
      <label class="product__label">Categoría</label>
      <input type="hidden" name="id" id="selectedVariantId" value="{{ current_variant.id }}">
      <div class="product__categories">
        {% for variant in product.variants %}
          <button
            type="button"
            class="product__category {% if variant == current_variant %}active{% endif %}"
            data-variant-id="{{ variant.id }}"
            data-price="{{ variant.price | money }}"
            onclick="selectCategory(this)">
            {{ variant.title }}
          </button>
        {% endfor %}
      </div>
    </div>
  {% endif %}

  {%- comment -%} Quantity {%- endcomment -%}
  <div class="product__field">
    <label for="quantity" class="product__label">Cantidad</label>
    <div class="product__quantity">
      <button type="button" class="product__qty-btn" onclick="decreaseQty()">−</button>
      <input type="number" name="quantity" id="quantity" min="1" value="1" readonly>
      <button type="button" class="product__qty-btn" onclick="increaseQty()">+</button>
    </div>
  </div>

  {%- comment -%} Submit {%- endcomment -%}
  <button type="submit" class="product__submit">
    {% if current_variant.available %}
      Inscribirse Ahora
    {% else %}
      Agotado
    {% endif %}
  </button>

  {%- comment -%} Benefits {%- endcomment -%}
  <div class="product__benefits">
    <div class="product__benefit">
      <svg><!-- check icon --></svg>
      <span>Mecánica Neutral Shimano</span>
    </div>
    <div class="product__benefit">
      <svg><!-- check icon --></svg>
      <span>Puntos campeonato nacional</span>
    </div>
    <div class="product__benefit">
      <svg><!-- check icon --></svg>
      <span>Premios en efectivo</span>
    </div>
  </div>
{% endform %}
```

### JavaScript de Selección de Categoría

```javascript
function selectCategory(button) {
  if (button.disabled) return;

  // Actualizar estado activo
  document.querySelectorAll('.product__category').forEach(btn => {
    btn.classList.remove('active');
  });
  button.classList.add('active');

  // Actualizar input hidden con variant ID
  const variantId = button.getAttribute('data-variant-id');
  document.getElementById('selectedVariantId').value = variantId;

  // Actualizar precio
  const price = button.getAttribute('data-price');
  document.getElementById('productPrice').textContent = price;
}

function increaseQty() {
  const input = document.getElementById('quantity');
  input.value = parseInt(input.value) + 1;
}

function decreaseQty() {
  const input = document.getElementById('quantity');
  if (parseInt(input.value) > 1) {
    input.value = parseInt(input.value) - 1;
  }
}
```

---

## CSS Variables y Diseño

### Variables CSS Globales

```css
:root {
  /* Colores principales */
  --color-primary: #E42C2C;        /* Rojo DHMEXRACES */
  --color-secondary: #0066B3;      /* Azul Shimano */
  --color-gold: #FFD700;           /* Dorado medallas */
  --color-success: #22C55E;        /* Verde éxito */
  --color-error: #EF4444;          /* Rojo error */
  --color-warning: #FFC107;        /* Amarillo warning */

  /* Fondos */
  --color-background: #000000;     /* Negro fondo */
  --color-surface: #1A1A1A;        /* Gris superficie */
  --color-surface-hover: #222222;  /* Gris hover */

  /* Texto */
  --color-text: #FFFFFF;           /* Blanco texto */
  --color-text-muted: rgba(255, 255, 255, 0.6);
  --color-text-subtle: rgba(255, 255, 255, 0.4);

  /* Bordes */
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-accent: rgba(228, 44, 44, 0.3);

  /* Tipografía */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 0.7rem;
  --font-size-sm: 0.85rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-3xl: 2.5rem;

  /* Espaciado */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Sombras */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.2);
  --shadow-accent: 0 4px 12px rgba(228, 44, 44, 0.3);
}
```

### Breakpoints Responsive

```css
/* Mobile first approach */

/* Base: 0 - 639px (Mobile) */
.product {
  padding: 100px 16px 60px;
}

/* Small: 640px+ */
@media (min-width: 640px) {
  .product {
    padding: 100px 20px 60px;
  }
}

/* Medium: 768px+ (Tablet) */
@media (min-width: 768px) {
  .product__categories {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Large: 968px+ (Desktop) */
@media (min-width: 968px) {
  .product {
    padding: 140px 24px 80px;
  }

  .product__container {
    grid-template-columns: 1.1fr 0.9fr;
    gap: 80px;
  }
}

/* XL: 1280px+ */
@media (min-width: 1280px) {
  .product__container {
    max-width: 1280px;
  }
}
```

### Estilos Principales

```css
/* Product Section */
.product {
  min-height: 100vh;
  padding: 140px 24px 80px;
  background: #000000;
  overflow-x: hidden;
}

.product__container {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 80px;
  align-items: start;
}

/* Gallery */
.product__gallery {
  position: sticky;
  top: 140px;
}

.product__main-image {
  border-radius: 24px;
  overflow: hidden;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.product__main-image:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

/* Price Card */
.product__price-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(228, 44, 44, 0.2);
  border-radius: 8px;
  padding: 18px 24px;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product__price {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* FOMO Badges */
.product__fomo-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.product__fomo-badge--urgente {
  background: rgba(228, 44, 44, 0.1);
  border-color: rgba(228, 44, 44, 0.3);
  animation: fomoPulse 2s ease-in-out infinite;
}

@keyframes fomoPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(228, 44, 44, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(228, 44, 44, 0); }
}

/* Categories Grid */
.product__categories {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.product__category {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #FFFFFF;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.product__category.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #000000;
}

/* Submit Button */
.product__submit {
  width: 100%;
  padding: 18px 32px;
  background: var(--color-primary);
  border: none;
  border-radius: 12px;
  color: #000000;
  font-size: 1.125rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
}

.product__submit:hover:not(:disabled) {
  background: #E85050;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(228, 44, 44, 0.3);
}
```

---

## Templates JSON

### product.inscripcion-guanajuato-2026.json

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

### page.kit-rider.json

```json
{
  "sections": {
    "main": {
      "type": "kit-rider",
      "blocks": {
        "block_medalla": {
          "type": "item",
          "settings": {
            "title": "Medalla Conmemorativa",
            "description": "Primeros 100 inscritos",
            "icon": "medal"
          }
        },
        "block_playera": {
          "type": "item",
          "settings": {
            "title": "Playera Oficial",
            "description": "Primeros 50 inscritos",
            "icon": "shirt"
          }
        }
      }
    }
  },
  "order": ["main"]
}
```

---

## Otras Secciones

### race-registration.liquid

Cards de categorías para la página principal.

### ranking.liquid

Tabla de posiciones del campeonato.

### kit-rider.liquid

Lista de beneficios incluidos en la inscripción.

### sponsors.liquid

Grid de logos de patrocinadores organizados por tier (Oro, Plata, Bronce).

### hero-video.liquid

Banner principal con video de fondo.

---

## Desarrollo Local

### Iniciar servidor de desarrollo

```bash
cd dhmexraces-custom
shopify theme dev --store tu-tienda.myshopify.com
```

El servidor corre en `http://127.0.0.1:9292`.

### Push cambios a producción

```bash
# Push completo
shopify theme push --live --allow-live

# Push solo una sección
shopify theme push --only sections/product.liquid --live --allow-live

# Push varios archivos
shopify theme push --only sections/product.liquid,assets/critical.css --live --allow-live
```

### Ver logs

```bash
shopify theme dev --verbose
```

---

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

Editar `sections/product.liquid`, buscar el form y agregar campos:

```html
<div class="form-field">
  <label for="nuevo_campo">Nuevo Campo</label>
  <input type="text" name="properties[nuevo_campo]" id="nuevo_campo">
</div>
```

---

## Troubleshooting

### El formulario no guarda datos

1. Verificar que `registration_data` se guarde en cart attributes
2. Revisar consola del navegador por errores
3. Verificar que el webhook esté configurado en Shopify

### FOMO badges muestran "--"

1. Verificar URL de la API en `sedeConfig`
2. Revisar que la API responda correctamente: `curl https://dhmexraces-webhooks.vercel.app/api/inventory?sede=guanajuato`
3. Verificar permisos CORS

### Countdown no aparece

1. Verificar que los metafields `event_date` estén configurados
2. Revisar formato de fecha (ISO 8601): `2026-03-07T08:00:00`
3. Verificar IDs únicos (`eventDays`, `eventHours`, etc.)

### Precios no cambian

1. Verificar metafields de fases (`phase1_price`, `phase1_end`, etc.)
2. Verificar que `pricing_enabled` sea `true`
3. Revisar lógica de fechas en JavaScript

### El tema no carga

```bash
shopify theme dev --verbose
```

Revisar errores de sintaxis Liquid o archivos faltantes.

---

## Schema de la Sección

```json
{% schema %}
{
  "name": "Product",
  "settings": [],
  "disabled_on": {
    "groups": ["header", "footer"]
  }
}
{% endschema %}
```
