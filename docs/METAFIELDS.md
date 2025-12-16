# Metafields - DHMEXRACES

Guía completa para configurar los metafields de productos de inscripción con precios dinámicos y fechas de evento.

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Lista Completa de Metafields](#lista-completa-de-metafields)
3. [Configuración Paso a Paso](#configuración-paso-a-paso)
4. [Precios Dinámicos por Fases](#precios-dinámicos-por-fases)
5. [Fechas del Evento](#fechas-del-evento)
6. [Ejemplo Completo: Guanajuato 2026](#ejemplo-completo-guanajuato-2026)
7. [Cómo el Tema Lee los Metafields](#cómo-el-tema-lee-los-metafields)
8. [Crear Definiciones via Admin](#crear-definiciones-via-admin)
9. [Crear Definiciones via GraphQL](#crear-definiciones-via-graphql)
10. [Metafields Opcionales](#metafields-opcionales)
11. [Troubleshooting](#troubleshooting)

---

## Visión General

Los metafields permiten almacenar datos personalizados en productos de Shopify. DHMEXRACES usa metafields para:

| Funcionalidad | Metafields |
|---------------|------------|
| **Precios Dinámicos** | `phase1_price`, `phase1_end`, `phase2_price`, etc. |
| **Countdown** | `event_date`, `event_date_label` |
| **Cierre Automático** | `close_date` |
| **Control** | `pricing_enabled` |

### Namespace

Todos los metafields usan el namespace `custom`:

```
custom.pricing_enabled
custom.phase1_price
custom.event_date
...
```

---

## Lista Completa de Metafields

### Metafields de Control

| Key | Tipo | Requerido | Descripción |
|-----|------|-----------|-------------|
| `custom.pricing_enabled` | Boolean | Sí | Activa el sistema de precios dinámicos |

### Metafields de Fase 1 (Early Bird)

| Key | Tipo | Requerido | Descripción |
|-----|------|-----------|-------------|
| `custom.phase1_price` | Number (Integer) | Sí | Precio en pesos (sin decimales) |
| `custom.phase1_label` | Single line text | Sí | Etiqueta (ej: "EARLY BIRD") |
| `custom.phase1_end` | Date and time | Sí | Fecha de fin de la fase |

### Metafields de Fase 2 (Regular)

| Key | Tipo | Requerido | Descripción |
|-----|------|-----------|-------------|
| `custom.phase2_price` | Number (Integer) | Sí | Precio regular |
| `custom.phase2_label` | Single line text | Sí | Etiqueta (ej: "PRECIO REGULAR") |
| `custom.phase2_end` | Date and time | Sí | Fecha de fin de la fase |

### Metafields de Fase 3 (Tardía)

| Key | Tipo | Requerido | Descripción |
|-----|------|-----------|-------------|
| `custom.phase3_price` | Number (Integer) | Sí | Precio de última hora |
| `custom.phase3_label` | Single line text | Sí | Etiqueta (ej: "INSCRIPCIÓN TARDÍA") |
| `custom.phase3_end` | Date and time | Sí | Fecha de cierre |

### Metafields del Evento

| Key | Tipo | Requerido | Descripción |
|-----|------|-----------|-------------|
| `custom.event_date` | Date and time | Sí | Fecha del evento (para countdown) |
| `custom.event_date_label` | Single line text | No | Texto adicional (ej: "para Guanajuato 2026") |
| `custom.close_date` | Date and time | No | Fecha de cierre de inscripciones |

---

## Configuración Paso a Paso

### 1. Acceder a Metafields

**Opción A - Desde el Producto:**
1. Ve a **Shopify Admin** → **Products**
2. Selecciona el producto de inscripción
3. Scroll hasta la sección **Metafields**

**Opción B - Desde Custom Data:**
1. Ve a **Settings** → **Custom data**
2. Click en **Products**
3. Ver/crear definiciones de metafields

### 2. Crear Definición de Metafield

Para cada metafield que no exista:

1. Click **Add definition**
2. Llenar los campos:
   - **Name**: Nombre visible (ej: "Precio Fase 1")
   - **Namespace and key**: `custom.phase1_price`
   - **Type**: Seleccionar el tipo apropiado
3. Click **Save**

### 3. Asignar Valores al Producto

1. Ir al producto
2. En la sección Metafields, llenar cada valor
3. Click **Save**

---

## Precios Dinámicos por Fases

El sistema de precios cambia automáticamente según la fecha actual.

### Diagrama de Fases

```
     FASE 1              FASE 2              FASE 3
    EARLY BIRD          REGULAR             TARDÍA
   ─────────────────────────────────────────────────────►
   │                    │                   │           │
   │    $1,200         │     $1,350       │   $1,500  │ CERRADO
   │                    │                   │           │
   └────────────────────┴───────────────────┴───────────┘
         15 Enero           14 Febrero         5 Marzo
         2026               2026               2026
```

### Lógica de Selección de Fase

```javascript
function getCurrentPhase(config) {
  const now = new Date();

  // Fase 1: Desde inicio hasta phase1_end
  if (now < new Date(config.phase1End)) {
    return {
      phase: 1,
      price: config.phase1Price,
      label: config.phase1Label
    };
  }

  // Fase 2: Desde phase1_end hasta phase2_end
  if (now < new Date(config.phase2End)) {
    return {
      phase: 2,
      price: config.phase2Price,
      label: config.phase2Label
    };
  }

  // Fase 3: Desde phase2_end hasta phase3_end
  if (now < new Date(config.phase3End)) {
    return {
      phase: 3,
      price: config.phase3Price,
      label: config.phase3Label
    };
  }

  // Después de phase3_end: Cerrado
  return {
    phase: 0,
    price: 0,
    label: 'INSCRIPCIONES CERRADAS',
    closed: true
  };
}
```

### Visualización en el Tema

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  EARLY BIRD - HASTA 15 ENERO                    │   │
│  │                                                 │   │
│  │           $1,200 MXN                            │   │
│  │                                                 │   │
│  │  ⚠️ El precio sube a $1,350 en 15 días          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ●─────────●─────────○                                  │
│  $1,200   $1,350   $1,500                              │
│  EARLY    REGULAR   TARDÍA                             │
│  BIRD                                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Fechas del Evento

### Countdown

El countdown muestra la cuenta regresiva hasta `event_date`:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│       ⏱️ FALTAN para Guanajuato 2026                    │
│                                                         │
│     ┌────┐  ┌────┐  ┌────┐  ┌────┐                     │
│     │ 45 │  │ 12 │  │ 30 │  │ 15 │                     │
│     │DÍAS│  │HRS │  │MIN │  │SEG │                     │
│     └────┘  └────┘  └────┘  └────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Cierre Automático

Si se configura `close_date`, las inscripciones se bloquean automáticamente:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     🚫 INSCRIPCIONES CERRADAS                           │
│                                                         │
│     Las inscripciones para esta sede han cerrado.       │
│     Gracias por tu interés.                             │
│                                                         │
│     ┌─────────────────────────────────────────────┐    │
│     │  INSCRIBIRSE AHORA  (disabled)              │    │
│     └─────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Ejemplo Completo: Guanajuato 2026

### Datos del Evento

- **Sede**: Guanajuato
- **Fecha de carrera**: 7 de Marzo 2026
- **Cierre de inscripciones**: 5 de Marzo 2026

### Fases de Precio

| Fase | Precio | Fecha Inicio | Fecha Fin |
|------|--------|--------------|-----------|
| Early Bird | $1,200 | 1 Dic 2025 | 15 Ene 2026 |
| Regular | $1,350 | 16 Ene 2026 | 14 Feb 2026 |
| Tardía | $1,500 | 15 Feb 2026 | 5 Mar 2026 |

### Valores de Metafields

```
custom.pricing_enabled     = true

custom.phase1_price        = 1200
custom.phase1_label        = "EARLY BIRD - HASTA 15 ENERO"
custom.phase1_end          = 2026-01-15T23:59:00

custom.phase2_price        = 1350
custom.phase2_label        = "PRECIO REGULAR - HASTA 14 FEBRERO"
custom.phase2_end          = 2026-02-14T23:59:00

custom.phase3_price        = 1500
custom.phase3_label        = "INSCRIPCIÓN TARDÍA"
custom.phase3_end          = 2026-03-05T23:59:00

custom.event_date          = 2026-03-07T08:00:00
custom.event_date_label    = "para Guanajuato 2026"
custom.close_date          = 2026-03-05T23:59:00
```

### Formato de Fechas

Las fechas deben estar en formato **ISO 8601**:

```
YYYY-MM-DDTHH:MM:SS

Ejemplos:
2026-01-15T23:59:00    (15 de Enero 2026, 23:59:00)
2026-03-07T08:00:00    (7 de Marzo 2026, 08:00:00)
```

---

## Cómo el Tema Lee los Metafields

### Liquid - Pasar Datos a JavaScript

```liquid
{% comment %} En sections/product.liquid {% endcomment %}

{% assign pricing_enabled = product.metafields.custom.pricing_enabled %}

{% if pricing_enabled %}
  <script id="pricingConfig" type="application/json">
    {
      "enabled": true,
      "phases": [
        {
          "price": {{ product.metafields.custom.phase1_price | default: 0 }},
          "label": {{ product.metafields.custom.phase1_label | json }},
          "end": "{{ product.metafields.custom.phase1_end | date: '%Y-%m-%dT%H:%M:%S' }}"
        },
        {
          "price": {{ product.metafields.custom.phase2_price | default: 0 }},
          "label": {{ product.metafields.custom.phase2_label | json }},
          "end": "{{ product.metafields.custom.phase2_end | date: '%Y-%m-%dT%H:%M:%S' }}"
        },
        {
          "price": {{ product.metafields.custom.phase3_price | default: 0 }},
          "label": {{ product.metafields.custom.phase3_label | json }},
          "end": "{{ product.metafields.custom.phase3_end | date: '%Y-%m-%dT%H:%M:%S' }}"
        }
      ]
    }
  </script>
{% endif %}

<script id="sedeConfig" type="application/json">
  {
    "productTitle": {{ product.title | json }},
    "eventDate": "{{ product.metafields.custom.event_date | date: '%Y-%m-%dT%H:%M:%S' }}",
    "eventDateLabel": {{ product.metafields.custom.event_date_label | default: "" | json }},
    "closeDate": "{{ product.metafields.custom.close_date | date: '%Y-%m-%dT%H:%M:%S' }}"
  }
</script>
```

### JavaScript - Leer Configuración

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // Leer configuración de precios
  const pricingConfig = document.getElementById('pricingConfig');
  if (pricingConfig) {
    const config = JSON.parse(pricingConfig.textContent);
    if (config.enabled) {
      initDynamicPricing(config);
    }
  }

  // Leer configuración del evento
  const sedeConfig = document.getElementById('sedeConfig');
  if (sedeConfig) {
    const config = JSON.parse(sedeConfig.textContent);
    initEventCountdown(config);
    checkCloseDate(config);
  }
});
```

---

## Crear Definiciones via Admin

### Paso 1: Ir a Custom Data

1. **Settings** → **Custom data**
2. Click en **Products**

### Paso 2: Crear cada definición

**pricing_enabled:**
- Name: `Pricing Enabled`
- Namespace and key: `custom.pricing_enabled`
- Type: **True or false**
- Description: `Activa el sistema de precios dinámicos`

**phase1_price:**
- Name: `Precio Fase 1`
- Namespace and key: `custom.phase1_price`
- Type: **Number** → **Integer**
- Description: `Precio Early Bird en pesos`

**phase1_label:**
- Name: `Etiqueta Fase 1`
- Namespace and key: `custom.phase1_label`
- Type: **Single line text**
- Description: `Etiqueta que se muestra (ej: EARLY BIRD)`

**phase1_end:**
- Name: `Fin Fase 1`
- Namespace and key: `custom.phase1_end`
- Type: **Date and time**
- Description: `Fecha y hora de fin de Early Bird`

*(Repetir para phase2 y phase3)*

**event_date:**
- Name: `Fecha del Evento`
- Namespace and key: `custom.event_date`
- Type: **Date and time**
- Description: `Fecha de la carrera (para countdown)`

**event_date_label:**
- Name: `Etiqueta Countdown`
- Namespace and key: `custom.event_date_label`
- Type: **Single line text**
- Description: `Texto adicional del countdown`

**close_date:**
- Name: `Fecha de Cierre`
- Namespace and key: `custom.close_date`
- Type: **Date and time**
- Description: `Fecha de cierre automático de inscripciones`

---

## Crear Definiciones via GraphQL

### Mutation para pricing_enabled

```graphql
mutation CreatePricingEnabledMetafield {
  metafieldDefinitionCreate(
    definition: {
      name: "Pricing Enabled"
      namespace: "custom"
      key: "pricing_enabled"
      type: "boolean"
      ownerType: PRODUCT
      description: "Activa el sistema de precios dinámicos"
    }
  ) {
    createdDefinition {
      id
      name
    }
    userErrors {
      message
      field
    }
  }
}
```

### Mutation para phase1_price

```graphql
mutation CreatePhase1PriceMetafield {
  metafieldDefinitionCreate(
    definition: {
      name: "Precio Fase 1"
      namespace: "custom"
      key: "phase1_price"
      type: "number_integer"
      ownerType: PRODUCT
      description: "Precio Early Bird en pesos (sin decimales)"
    }
  ) {
    createdDefinition {
      id
      name
    }
    userErrors {
      message
      field
    }
  }
}
```

### Mutation para phase1_end

```graphql
mutation CreatePhase1EndMetafield {
  metafieldDefinitionCreate(
    definition: {
      name: "Fin Fase 1"
      namespace: "custom"
      key: "phase1_end"
      type: "date_time"
      ownerType: PRODUCT
      description: "Fecha y hora de fin del Early Bird"
    }
  ) {
    createdDefinition {
      id
      name
    }
    userErrors {
      message
      field
    }
  }
}
```

### Mutation para event_date

```graphql
mutation CreateEventDateMetafield {
  metafieldDefinitionCreate(
    definition: {
      name: "Fecha del Evento"
      namespace: "custom"
      key: "event_date"
      type: "date_time"
      ownerType: PRODUCT
      description: "Fecha de la carrera para el countdown"
    }
  ) {
    createdDefinition {
      id
      name
    }
    userErrors {
      message
      field
    }
  }
}
```

---

## Metafields Opcionales

Para funcionalidades futuras:

| Metafield | Tipo | Uso |
|-----------|------|-----|
| `custom.max_participants` | Number | Límite de inscripciones |
| `custom.practice_date` | Date and time | Fecha de práctica |
| `custom.race_date` | Date and time | Fecha de carrera (diferente a event_date) |
| `custom.location_map` | URL | Link a Google Maps |
| `custom.schedule_pdf` | File reference | PDF con horarios |
| `custom.race_round` | Single line text | Número de ronda (ej: "SEDE 1") |
| `custom.race_location` | Single line text | Ubicación textual |

---

## Troubleshooting

### Los metafields no aparecen en el producto

1. Verificar que la **definición** esté creada
   - Settings → Custom data → Products
2. Verificar namespace y key exactos
   - `custom.phase1_price` (no `Phase1_price`)
3. Limpiar caché del navegador
4. Recargar el admin de Shopify

### El precio no cambia automáticamente

1. Verificar que `pricing_enabled` = `true`
2. Verificar formato de fechas (ISO 8601)
   - Correcto: `2026-01-15T23:59:00`
   - Incorrecto: `15/01/2026 23:59`
3. Verificar zona horaria del navegador
4. Revisar consola JavaScript por errores

### El countdown muestra "NaN"

1. Verificar que `event_date` tenga valor
2. Verificar formato de fecha
3. Usar filtro Liquid correcto:
   ```liquid
   {{ product.metafields.custom.event_date | date: '%Y-%m-%dT%H:%M:%S' }}
   ```
4. Verificar que el metafield sea tipo **Date and time**

### Las inscripciones no cierran automáticamente

1. Verificar que `close_date` esté configurado
2. Verificar que la fecha sea en el pasado (para probar)
3. Verificar lógica JavaScript:
   ```javascript
   if (now > closeDate) {
     // Deshabilitar inscripciones
   }
   ```

### El badge de fase no aparece

1. Verificar que `phase1_label`, `phase2_label`, `phase3_label` tengan valor
2. Verificar que los elementos HTML existan:
   ```html
   <span id="phaseBadge"></span>
   ```

### Precios en 0 o undefined

1. Verificar que `phase1_price`, `phase2_price`, `phase3_price` sean números
2. Usar default en Liquid:
   ```liquid
   {{ product.metafields.custom.phase1_price | default: 0 }}
   ```

### Error al guardar metafield

1. Verificar tipo de dato correcto
   - Integer para precios (no decimal)
   - Date and time para fechas
2. Verificar validaciones en la definición
3. Revisar límites de caracteres

---

## Resumen Rápido

### Metafields Mínimos Requeridos

Para que funcione el sistema de precios dinámicos:

```
✅ custom.pricing_enabled = true

✅ custom.phase1_price = 1200
✅ custom.phase1_label = "EARLY BIRD"
✅ custom.phase1_end = 2026-01-15T23:59:00

✅ custom.phase2_price = 1350
✅ custom.phase2_label = "PRECIO REGULAR"
✅ custom.phase2_end = 2026-02-14T23:59:00

✅ custom.phase3_price = 1500
✅ custom.phase3_label = "INSCRIPCIÓN TARDÍA"
✅ custom.phase3_end = 2026-03-05T23:59:00

✅ custom.event_date = 2026-03-07T08:00:00
```

### Opcional pero Recomendado

```
❓ custom.event_date_label = "para Guanajuato 2026"
❓ custom.close_date = 2026-03-05T23:59:00
```
