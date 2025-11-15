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
│   ├── 404.liquid                # Página de error 404
│   ├── header.liquid             # Header del sitio
│   ├── header-group.json         # Configuración del header
│   ├── footer.liquid             # Footer del sitio
│   ├── footer-group.json         # Configuración del footer
│   ├── hero-video.liquid         # Hero principal con video
│   ├── race-dates.liquid         # Sección de fechas de carreras
│   ├── sponsors.liquid           # Sección de patrocinadores
│   ├── race-registration.liquid  # Sección de inscripciones
│   ├── product.liquid            # Página de producto
│   └── [otras secciones]
│
├── snippets/
│   ├── aos-animations.liquid    # Animaciones AOS
│   ├── css-variables.liquid     # Variables CSS del tema
│   ├── image.liquid             # Helper para imágenes
│   └── meta-tags.liquid         # Meta tags SEO
│
└── templates/
    ├── index.json               # Template homepage
    ├── 404.json                 # Template 404
    ├── product.json             # Template producto default
    ├── product.guanajuato.json  # Template producto Guanajuato
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

### Correcciones Aplicadas (V.1 FUNCIONAL)
1. ✅ Eliminada coma extra en `sections/header-group.json`
2. ✅ Agregados atributos width/height en imágenes
3. ✅ Agregado `defer` al script de animaciones AOS
4. ✅ Configurado `settings_data.json` con datos básicos
5. ✅ Subido logo oficial (dhmexraces-logo.png)

### Warnings Menores
- Remote assets (AOS CDN) - No crítico
- Missing video URL en hero - Opcional

---

## 🔄 Próximos Pasos (V.2)

- [ ] Crear productos para las 4 sedes restantes
- [ ] Agregar video al hero
- [ ] Implementar sistema de notificaciones
- [ ] Integrar pasarela de pagos
- [ ] Agregar galería de fotos/videos
- [ ] Implementar blog/noticias
- [ ] SEO optimization
- [ ] Performance optimization

---

## 👥 Equipo

**Desarrollo:** Claude Code + Usuario
**Cliente:** DHMEXRACES
**Repositorio:** https://github.com/PRAZIS-TECHNOLOGIES/DHMEXRACES-SHOPIFY

---

## 📄 Licencia

Todos los derechos reservados © 2025 DHMEXRACES
