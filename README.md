# DHMEXRACES - Tema Shopify Custom

Tema personalizado para la tienda oficial de COPA SCOTT DHMEXRACES 2026.

## 📋 Información del Proyecto

- **Tienda:** dhmexraces1.myshopify.com
- **Tema:** DHMEXRACES Dev (#137637101634)
- **Versión:** V.1 FUNCIONAL
- **Fecha:** 15 Noviembre 2025
- **Framework:** Shopify Liquid + CSS

---

## 🎯 Descripción

Tienda oficial para la Copa SCOTT DHMEXRACES 2026 - El campeonato nacional de downhill MTB más grande de México.

**Características:**
- $500,000 MXN en premios totales
- 5 sedes a lo largo del año
- 13 categorías de competencia
- Patrocinadores: SCOTT, SHIMANO, RED BULL, MOTUL, SRAM, y más

---

## 📁 Estructura del Proyecto

```
dhmexraces-custom/
├── assets/
│   ├── critical.css              # Estilos críticos globales
│   ├── dhmexraces-logo.png       # Logo oficial (125KB)
│   ├── icon-account.svg          # Icono de cuenta
│   ├── icon-cart.svg             # Icono de carrito
│   └── shoppy-x-ray.svg          # Icono auxiliar
│
├── blocks/
│   ├── group.liquid              # Block para agrupaciones
│   └── text.liquid               # Block de texto
│
├── config/
│   ├── settings_data.json        # Configuración del tema
│   └── settings_schema.json      # Schema de configuración
│
├── layout/
│   ├── password.liquid           # Layout de página con contraseña
│   └── theme.liquid              # Layout principal del tema
│
├── locales/
│   ├── en.default.json           # Traducciones (inglés)
│   └── en.default.schema.json    # Schema de traducciones
│
├── sections/
│   ├── 404.liquid                        # Página de error 404
│   ├── header.liquid                     # Header del sitio (con link Ranking)
│   ├── header-group.json                 # Configuración del header
│   ├── footer.liquid                     # Footer del sitio
│   ├── footer-group.json                 # Configuración del footer
│   ├── hero-video.liquid                 # Hero principal con video
│   ├── race-dates.liquid                 # Sección de fechas de carreras
│   ├── sponsors.liquid                   # Sección de patrocinadores
│   ├── race-registration.liquid          # Sección de inscripciones (variantes)
│   ├── race-registration-guanajuato.liquid # Página registro Guanajuato
│   ├── product.liquid                    # Página de producto (con auto-select)
│   ├── cart-custom.liquid                # Carrito personalizado
│   ├── registration-form.liquid          # Formulario multi-inscripción
│   ├── ranking.liquid                    # Página de ranking con filtros
│   └── [otras secciones]
│
├── snippets/
│   ├── aos-animations.liquid    # Animaciones AOS
│   ├── css-variables.liquid     # Variables CSS del tema
│   ├── image.liquid             # Helper para imágenes
│   └── meta-tags.liquid         # Meta tags SEO
│
└── templates/
    ├── index.json                      # Template homepage
    ├── 404.json                        # Template 404
    ├── product.json                    # Template producto default
    ├── product.guanajuato.json         # Template producto Guanajuato
    ├── cart.json                       # Template carrito custom
    ├── page.registration-form.json     # Template formulario inscripción
    ├── page.ranking.json               # Template página ranking
    └── [otros templates]
```

---

## 🎨 Diseño y Estilos

### Paleta de Colores
- **Negro:** #000000 (Background principal)
- **Naranja:** #FF4D00 (Primario)
- **Dorado:** #FFB800 (Accentos)
- **Blanco:** #FFFFFF (Texto)

### Tipografía
- **Font Stack:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
- **Estilo:** Ultra bold, tamaños grandes (hasta 9rem en títulos)
- **Efectos:** Gradientes, sombras, glassmorphism

### Features de Diseño
- ✅ Responsive (Mobile-first)
- ✅ Dark theme nativo
- ✅ Animaciones AOS (Animate On Scroll)
- ✅ Gradientes en textos y backgrounds
- ✅ Custom scrollbar
- ✅ Glassmorphism effects

---

## 🏁 Secciones Principales

### 1. Hero Video (`hero-video.liquid`)
Sección hero principal con:
- Video de fondo (opcional)
- Título principal: "COPA SCOTT DHMEXRACES 2026"
- Descripción con highlights
- Dos botones CTA
- Efectos visuales: glow, gradientes

### 2. Race Dates (`race-dates.liquid`)
Calendario de las 5 sedes:
1. **SEDE 1 - GUANAJUATO** (21-22 Feb 2026)
2. **SEDE 2 - PUEBLA** (21-22 Mar 2026)
3. **SEDE 3 - GUADALAJARA** (30-31 Mayo 2026)
4. **SEDE 4 - IXTAPAN DE LA SAL** (18-19 Julio 2026)
5. **SEDE 5 - TAXCO** (24-25 Oct 2026) - FINAL

Cada sede incluye:
- Badge de estado (upcoming/live/completed)
- Fecha y ubicación
- Premios ($100,000 MXN por sede)
- Descripción
- Botón de inscripción/info

### 3. Sponsors (`sponsors.liquid`)
Grid de patrocinadores oficiales:
- SCOTT (Title Sponsor)
- SHIMANO (Mecánica Neutral)
- RED BULL
- MOTUL
- SRAM
- SCHWALBE
- FOX FACTORY
- VITTORIA
- LAZER
- GIRO
- ALPINESTARS
- RACE FACE
- SYNCROS
- ZEFAL

### 4. Race Registration (`race-registration.liquid`)
Sección de inscripciones:
- Título y fecha de apertura
- 13 categorías disponibles
- CTA para notificaciones

---

## 🛍️ Producto Configurado

**Nombre:** Inscripción SEDE 1 - Guanajuato 2026
**Handle:** `inscripcion-guanajuato-2026`
**Precio:** $1,300 MXN

### Variantes (13 Categorías)
1. Elite Hombres
2. Elite Mujeres
3. Sub-Elite Hombres
4. Sub-Elite Mujeres
5. Master A (30-39 años)
6. Master B (40-49 años)
7. Master C (50+ años)
8. Juvenil Varonil (17-19 años)
9. Juvenil Femenil (17-19 años)
10. Infantil Varonil (15-16 años)
11. Infantil Femenil (15-16 años)
12. Principiantes Varonil
13. Principiantes Femenil

---

## ⚙️ Configuración

### Variables CSS (`snippets/css-variables.liquid`)
Variables CSS globales para colores, espaciados, y breakpoints.

### Animaciones (`snippets/aos-animations.liquid`)
- Librería: AOS 2.3.1
- Duración: 800ms
- Easing: ease-in-out
- Trigger: once (una sola vez)
- Offset: 100px

---

## 🚀 Deployment

### Comandos Shopify CLI

**Subir tema completo:**
```bash
cd C:\Users\gibra\DHMEXRACES-theme\dhmexraces-custom
shopify theme push --live --allow-live
```

**Subir archivos específicos:**
```bash
shopify theme push --live --allow-live --only sections/hero-video.liquid
```

**Verificar errores:**
```bash
shopify theme check
```

### URLs Importantes
- **Tienda:** https://dhmexraces1.myshopify.com
- **Admin:** https://dhmexraces1.myshopify.com/admin
- **Editor:** https://dhmexraces1.myshopify.com/admin/themes/137637101634/editor
- **Productos:** https://dhmexraces1.myshopify.com/admin/products

---

## 🔐 Acceso

**Contraseña de la tienda:** `gibs`

La tienda está en modo desarrollo (password protected) hasta que se seleccione un plan de pago de Shopify.

---

## 🐛 Troubleshooting

### Error: "Not Found" / Página 404
**Solución:** Subir todo el tema completo con `shopify theme push --live --allow-live`

### Error: JSON syntax error en header-group.json
**Solución:** Eliminar coma extra en el último elemento del array "order"

### Error: Imágenes sin width/height
**Solución:** Agregar atributos width y height a todas las tags `<img>`

### Error: Parser blocking scripts
**Solución:** Agregar `defer` o `async` a los scripts externos

---

## 📝 Notas de Desarrollo

### V.1 FUNCIONAL (15 Nov 2025)
1. ✅ Eliminada coma extra en `sections/header-group.json`
2. ✅ Agregados atributos width/height en imágenes
3. ✅ Agregado `defer` al script de animaciones AOS
4. ✅ Configurado `settings_data.json` con datos básicos
5. ✅ Subido logo oficial (dhmexraces-logo.png)

### V.2 CHECKOUT & RANKING (15 Nov 2025)
1. ✅ Sistema completo de checkout e inscripciones
2. ✅ Carrito personalizado con summary
3. ✅ Formulario multi-inscripción dinámico
4. ✅ Página de Ranking con filtros por categoría
5. ✅ Auto-selección de categorías desde registro
6. ✅ Herramienta Excel to Ranking converter
7. ✅ Link de Ranking en header
8. ✅ 5 sedes configuradas en ranking

### V.3 RANKING OVERALL & TEAMS (15 Nov 2025)
1. ✅ Sistema de Ranking Overall acumulado
2. ✅ Campo "Equipo" agregado a tablas de ranking
3. ✅ Excel converter actualizado a 6 columnas (con equipo)
4. ✅ Botón "VER OVERALL" en página de ranking
5. ✅ Cálculo automático de puntos acumulados
6. ✅ Filtros por categoría en overall
7. ✅ Fix de visibilidad de tarjetas upcoming
8. ✅ Templates con 5 bloques pre-configurados

### Warnings Menores
- Remote assets (AOS CDN) - No crítico
- Missing video URL en hero - Opcional

---

## 🆕 Nuevas Funcionalidades (V.2)

### 1. Sistema de Checkout Completo

**Flujo de inscripción:**
1. Usuario selecciona categoría en producto
2. Agrega al carrito (puede agregar múltiples inscripciones)
3. Ve resumen en `/cart` con cantidades y totales
4. Click en "Continuar al Registro"
5. Formulario dinámico (uno por cada inscripción)
6. Validación de campos y datos
7. Redirect a Shopify checkout

**Archivos involucrados:**
- `sections/cart-custom.liquid` - Carrito personalizado
- `sections/registration-form.liquid` - Formulario multi-inscripción
- `templates/cart.json` - Template del carrito
- `templates/page.registration-form.json` - Template del formulario

**Datos capturados por inscripción:**
- Nombre Completo
- Fecha de Nacimiento
- Equipo (opcional)
- Email
- Teléfono
- Categoría (auto-llenada)

### 2. Página de Ranking

**Características:**
- Diseño tipo F1 profesional
- Filtros por categoría (automáticos)
- Reorganización dinámica de posiciones
- Estilos especiales para podio (oro, plata, bronce)
- Estado: Próximamente / Completada
- 5 sedes configuradas

**Cómo agregar resultados:**

1. **Opción A: Manual en Shopify**
   - Ve a Theme Customizer → Página Ranking
   - Selecciona el bloque de la carrera
   - Cambia estado a "Completada"
   - Pega datos en formato: `posición|nombre|categoría|tiempo|puntos||...`

2. **Opción B: Excel (Recomendado)**
   - Abre `excel-to-ranking-converter.html` en navegador
   - Prepara Excel con columnas: Posición | Nombre | Categoría | Tiempo | Puntos
   - Arrastra archivo a la herramienta
   - Copia el resultado generado
   - Pega en Shopify Theme Customizer

**Formato de datos (6 columnas con equipo):**
```
1|Juan Pérez|Elite|Team Scott|2:15:30|100||2|María González|Elite Femenil|Shimano Racing|2:20:45|80
```

**Filtros por categoría:**
- Detecta automáticamente categorías únicas
- Genera botones de filtro si hay >1 categoría
- Reorganiza posiciones al filtrar
- Mantiene estilos de podio (1°, 2°, 3°)

### 3. Auto-Selección de Categorías

**Funcionamiento:**
- Usuario hace click en categoría desde página de registro
- Sistema guarda categoría en `sessionStorage`
- Al llegar a página de producto, auto-selecciona la categoría
- Scroll automático a la categoría seleccionada

**Archivos:**
- `sections/race-registration.liquid` - Guarda categoría
- `sections/race-registration-guanajuato.liquid` - Página dedicada Guanajuato
- `sections/product.liquid` - Auto-selecciona categoría

### 4. Herramienta Excel to Ranking

**Ubicación:** `excel-to-ranking-converter.html` (raíz del proyecto)

**Funcionalidades:**
- Convierte archivos .xlsx / .xls
- Detecta y elimina filas de encabezados automáticamente
- Convierte tiempos de Excel (decimal) a formato HH:MM:SS
- Valida que posiciones sean números
- Genera formato compatible con Shopify
- Drag & drop
- Copia al portapapeles con un click

**Formato Excel requerido (ACTUALIZADO - 6 columnas):**
| Posición | Nombre | Categoría | Equipo | Tiempo | Puntos |
|----------|---------|-----------|--------|---------|---------|
| 1 | Juan | Elite | Team Scott | 2:15:30 | 100 |
| 2 | María | Amateur | Shimano | 2:20:45 | 80 |

**Salida generada:**
```
1|Juan|Elite|Team Scott|2:15:30|100||2|María|Amateur|Shimano|2:20:45|80
```

### 5. Sistema de Ranking Overall

**Ubicación:** `/pages/ranking-overall`

**Características:**
- Calcula automáticamente el ranking acumulado de TODAS las sedes
- Toma el MEJOR resultado de cada corredor por sede
- Suma solo los mejores resultados para el puntaje total
- Filtros automáticos por categoría
- Estilos de podio (oro, plata, bronce)
- Muestra equipo de cada corredor
- Diferencia de puntos vs. líder

**Cómo funciona:**
1. Hace fetch a `/pages/ranking` vía JavaScript
2. Extrae todos los resultados de las sedes completadas
3. Agrupa por sede y por corredor
4. Calcula el MEJOR puntaje de cada corredor en cada sede
5. Suma los mejores puntajes de todas las sedes
6. Ordena por puntaje total descendente

**Ejemplo de cálculo:**
```
Corredor: "gibran" - Categoría: "elite"

SEDE 1 - Guanajuato:
- Aparición 1: 100 puntos
- Aparición 2: 101 puntos
- Aparición 3: 102 puntos
- Aparición 4: 103 puntos
→ MEJOR: 103 puntos

SEDE 2 - Puebla:
- Aparición 1: 100 puntos
- Aparición 2: 101 puntos
- Aparición 3: 102 puntos
- Aparición 4: 103 puntos
→ MEJOR: 103 puntos

TOTAL OVERALL: 103 + 103 = 206 puntos ✅
```

**Archivos involucrados:**
- `sections/ranking-overall.liquid` - Sección principal de overall
- `templates/page.ranking-overall.json` - Template de la página
- `sections/ranking.liquid` - Botón "VER OVERALL" agregado

**Campos mostrados:**
- Posición
- Nombre del corredor
- Categoría
- Equipo
- Puntos totales
- Diferencia con el líder

---

## 🔧 Fixes y Mejoras Técnicas (V.3)

### Fix de Visibilidad de Tarjetas Upcoming
**Problema:** Al cambiar una sede de "upcoming" a "completed", las demás sedes configuradas como "upcoming" se volvían invisibles.

**Solución implementada:**
1. Agregado `display: block !important` a `.ranking-card`
2. Agregado `visibility: visible !important` y `opacity: 1 !important`
3. Fondo naranja visible para tarjetas upcoming: `rgba(255, 77, 0, 0.1)`
4. Borde más grueso: `2px solid rgba(255, 77, 0, 0.3)`
5. `min-height: 300px` en secciones upcoming
6. Template pre-configurado con 5 bloques de sedes

**Archivos modificados:**
- `sections/ranking.liquid` - CSS con !important flags
- `templates/page.ranking.json` - 5 bloques pre-configurados

### Templates Pre-configurados
Todas las páginas de ranking ahora incluyen los 5 bloques de sedes por defecto:
1. SEDE 1 - Guanajuato (21-22 Febrero 2026)
2. SEDE 2 - Puebla (21-22 Marzo 2026)
3. SEDE 3 - Guadalajara (30-31 Mayo 2026)
4. SEDE 4 - Ixtapan de la Sal (18-19 Julio 2026)
5. SEDE 5 - Taxco (24-25 Octubre 2026 - GRAN FINAL)

---

## 🔄 Próximos Pasos (V.4)

- [ ] Crear productos para las 4 sedes restantes
- [ ] Agregar video al hero
- [ ] Implementar sistema de notificaciones
- [ ] Agregar galería de fotos/videos
- [ ] Implementar blog/noticias
- [ ] SEO optimization
- [ ] Performance optimization
- [ ] Dashboard de administración de inscripciones
- [ ] Sistema de puntos automático por posición

---

## 👥 Equipo

**Desarrollo:** Claude Code + Usuario
**Cliente:** DHMEXRACES
**Repositorio:** https://github.com/PRAZIS-TECHNOLOGIES/DHMEXRACES-SHOPIFY

---

## 📄 Licencia

Todos los derechos reservados © 2025 DHMEXRACES
