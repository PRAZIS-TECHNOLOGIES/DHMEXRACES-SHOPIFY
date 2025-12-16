# Metafields - DHMEXRACES

Guía completa para configurar los metafields de productos de inscripción.

## Metafields de Producto

Los productos de inscripción usan metafields personalizados para controlar precios dinámicos, fechas y contadores.

### Acceder a Metafields

1. Ve a **Shopify Admin** → **Products**
2. Selecciona el producto de inscripción
3. Scroll hasta la sección **Metafields**
4. O accede via **Settings** → **Custom data** → **Products**

---

## Metafields de Precios Dinámicos

### `custom.pricing_enabled`

| Propiedad | Valor |
|-----------|-------|
| **Namespace** | custom |
| **Key** | pricing_enabled |
| **Tipo** | True or false (Boolean) |
| **Descripción** | Activa/desactiva el sistema de precios por fases |

**Valores:**
- `true`: Usa precios dinámicos según fases
- `false`: Usa precio estándar del producto

---

### Fase 1: Early Bird

#### `custom.phase1_price`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Number (Integer) |
| **Descripción** | Precio en pesos (sin decimales) |
| **Ejemplo** | `1200` |

#### `custom.phase1_label`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Single line text |
| **Descripción** | Etiqueta que se muestra al usuario |
| **Ejemplo** | `EARLY BIRD - HASTA 15 ENERO` |

#### `custom.phase1_end`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Date and time |
| **Descripción** | Fecha y hora de fin de la fase |
| **Formato** | `2026-01-15T23:59:00` |

---

### Fase 2: Precio Regular

#### `custom.phase2_price`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Number (Integer) |
| **Descripción** | Precio regular |
| **Ejemplo** | `1350` |

#### `custom.phase2_label`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Single line text |
| **Ejemplo** | `PRECIO REGULAR - HASTA 14 FEBRERO` |

#### `custom.phase2_end`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Date and time |
| **Formato** | `2026-02-14T23:59:00` |

---

### Fase 3: Inscripción Tardía

#### `custom.phase3_price`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Number (Integer) |
| **Descripción** | Precio de última hora |
| **Ejemplo** | `1500` |

#### `custom.phase3_label`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Single line text |
| **Ejemplo** | `INSCRIPCIÓN TARDÍA A PARTIR DE 14 DE FEBRERO` |

#### `custom.phase3_end`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Date and time |
| **Descripción** | Cierre de inscripciones |
| **Formato** | `2026-03-01T23:59:00` |

---

## Metafields del Evento

### `custom.event_date`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Date and time |
| **Descripción** | Fecha del evento (para countdown) |
| **Ejemplo** | `2026-03-07T08:00:00` |

### `custom.event_date_label`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Single line text |
| **Descripción** | Texto que acompaña al countdown |
| **Ejemplo** | `para Guanajuato 2026` |

### `custom.close_date`

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Date and time |
| **Descripción** | Fecha de cierre automático de inscripciones |
| **Ejemplo** | `2026-03-05T23:59:00` |

---

## Crear Metafields Personalizados

Si los metafields no existen, créalos:

### Vía Admin de Shopify:

1. **Settings** → **Custom data** → **Products**
2. Click **Add definition**
3. Configurar:
   - **Name**: Nombre visible
   - **Namespace and key**: `custom.nombre_campo`
   - **Type**: Seleccionar tipo apropiado
4. Click **Save**

### Vía GraphQL (Shopify Admin API):

```graphql
mutation CreateMetafieldDefinition {
  metafieldDefinitionCreate(
    definition: {
      name: "Pricing Enabled"
      namespace: "custom"
      key: "pricing_enabled"
      type: "boolean"
      ownerType: PRODUCT
    }
  ) {
    createdDefinition {
      id
    }
    userErrors {
      message
    }
  }
}
```

---

## Ejemplo de Configuración Completa

Para un producto de inscripción a **Guanajuato 2026**:

| Metafield | Valor |
|-----------|-------|
| `custom.pricing_enabled` | `true` |
| `custom.phase1_price` | `1200` |
| `custom.phase1_label` | `EARLY BIRD - HASTA 15 ENERO` |
| `custom.phase1_end` | `2026-01-15T23:59:00` |
| `custom.phase2_price` | `1350` |
| `custom.phase2_label` | `PRECIO REGULAR - HASTA 14 FEBRERO` |
| `custom.phase2_end` | `2026-02-14T23:59:00` |
| `custom.phase3_price` | `1500` |
| `custom.phase3_label` | `INSCRIPCIÓN TARDÍA` |
| `custom.phase3_end` | `2026-03-05T23:59:00` |
| `custom.event_date` | `2026-03-07T08:00:00` |
| `custom.event_date_label` | `para Guanajuato 2026` |
| `custom.close_date` | `2026-03-05T23:59:00` |

---

## Lógica de Precios en el Tema

El tema lee los metafields así:

```liquid
{% assign pricing_enabled = product.metafields.custom.pricing_enabled %}
{% if pricing_enabled %}
  <script id="sedeConfig" type="application/json">
    {
      "pricingEnabled": true,
      "phase1Price": {{ product.metafields.custom.phase1_price | default: 0 }},
      "phase1Label": {{ product.metafields.custom.phase1_label | json }},
      "phase1End": "{{ product.metafields.custom.phase1_end | date: '%Y-%m-%dT%H:%M:%S' }}",
      "phase2Price": {{ product.metafields.custom.phase2_price | default: 0 }},
      "phase2Label": {{ product.metafields.custom.phase2_label | json }},
      "phase2End": "{{ product.metafields.custom.phase2_end | date: '%Y-%m-%dT%H:%M:%S' }}",
      "phase3Price": {{ product.metafields.custom.phase3_price | default: 0 }},
      "phase3Label": {{ product.metafields.custom.phase3_label | json }},
      "phase3End": "{{ product.metafields.custom.phase3_end | date: '%Y-%m-%dT%H:%M:%S' }}",
      "eventDate": "{{ product.metafields.custom.event_date | date: '%Y-%m-%dT%H:%M:%S' }}",
      "eventDateLabel": {{ product.metafields.custom.event_date_label | json }},
      "closeDate": "{{ product.metafields.custom.close_date | date: '%Y-%m-%dT%H:%M:%S' }}"
    }
  </script>
{% endif %}
```

Y JavaScript determina la fase actual:

```javascript
function getCurrentPhase(config) {
  const now = new Date();

  if (now < new Date(config.phase1End)) {
    return { price: config.phase1Price, label: config.phase1Label, phase: 1 };
  }
  if (now < new Date(config.phase2End)) {
    return { price: config.phase2Price, label: config.phase2Label, phase: 2 };
  }
  if (now < new Date(config.phase3End)) {
    return { price: config.phase3Price, label: config.phase3Label, phase: 3 };
  }

  return { price: 0, label: 'INSCRIPCIONES CERRADAS', phase: 0, closed: true };
}
```

---

## Troubleshooting

### Los metafields no aparecen

1. Verificar que la definición esté creada
2. Verificar namespace y key exactos
3. Limpiar caché del navegador

### El precio no cambia

1. Verificar `pricing_enabled` = `true`
2. Verificar formato de fechas (ISO 8601)
3. Verificar zona horaria del navegador

### El countdown muestra "NaN"

1. Verificar formato de `event_date`
2. Usar filtro Liquid: `| date: '%Y-%m-%dT%H:%M:%S'`
3. Verificar que el metafield tenga valor

### Las inscripciones no cierran

1. Verificar `close_date`
2. Agregar lógica de validación en el formulario
3. Verificar que el JavaScript compare fechas correctamente

---

## Metafields Adicionales (Opcionales)

### Para futuras funcionalidades:

| Metafield | Tipo | Uso |
|-----------|------|-----|
| `custom.max_participants` | Number | Límite de inscripciones |
| `custom.practice_date` | Date | Fecha de práctica |
| `custom.race_date` | Date | Fecha de carrera |
| `custom.location_map` | URL | Link a Google Maps |
| `custom.schedule_pdf` | File | PDF con horarios |
