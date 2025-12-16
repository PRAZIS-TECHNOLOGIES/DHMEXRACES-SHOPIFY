# Google Sheets - Base de Datos DHMEXRACES

Guía completa de configuración y uso de Google Sheets como base de datos de corredores inscritos.

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Datos del Spreadsheet](#datos-del-spreadsheet)
3. [Estructura de Hojas](#estructura-de-hojas)
4. [Estructura de Columnas](#estructura-de-columnas)
5. [Crear el Spreadsheet](#crear-el-spreadsheet)
6. [Configurar Google Cloud](#configurar-google-cloud)
7. [Crear Cuenta de Servicio](#crear-cuenta-de-servicio)
8. [Compartir Spreadsheet](#compartir-spreadsheet)
9. [Variables de Entorno](#variables-de-entorno)
10. [Código de Conexión](#código-de-conexión)
11. [Operaciones Comunes](#operaciones-comunes)
12. [Fórmulas Útiles](#fórmulas-útiles)
13. [Dashboard de Estadísticas](#dashboard-de-estadísticas)
14. [Backup y Seguridad](#backup-y-seguridad)
15. [Troubleshooting](#troubleshooting)

---

## Visión General

Google Sheets sirve como base de datos para almacenar todos los corredores inscritos en DHMEXRACES. Ventajas:

| Ventaja | Descripción |
|---------|-------------|
| **Gratis** | Sin costo hasta límites generosos |
| **Accesible** | Ver datos desde cualquier navegador |
| **Colaborativo** | Múltiples personas pueden ver/editar |
| **API Nativa** | Integración sencilla con Node.js |
| **Exportable** | Descargar como Excel, CSV, PDF |

### Flujo de Datos

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│    SHOPIFY      │─────►│  VERCEL API    │─────►│  GOOGLE SHEETS  │
│    (Pedido)     │      │  (Webhook)     │      │  (Base de datos)│
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                           │
                                                           │
                              ┌─────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │                 │
                    │    DASHBOARD    │
                    │   (Check-in)    │
                    │                 │
                    └─────────────────┘
```

---

## Datos del Spreadsheet

### Spreadsheet Principal

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | DHMEXRACES 2026 |
| **ID** | `1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg` |
| **URL** | `https://docs.google.com/spreadsheets/d/1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg` |

### Cómo encontrar el ID

El ID está en la URL del spreadsheet:

```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
                                        ^^^^^^^^^^^^^^^^
                                        Este es el ID
```

---

## Estructura de Hojas

El spreadsheet tiene una hoja por cada sede del campeonato:

```
📊 DHMEXRACES 2026
│
├── 📋 GUANAJUATO      ← Sede 1 (7 de Marzo 2026)
├── 📋 PUEBLA          ← Sede 2 (11 de Abril 2026)
├── 📋 GUADALAJARA     ← Sede 3 (9 de Mayo 2026)
├── 📋 IXTAPAN         ← Sede 4 (13 de Junio 2026)
├── 📋 TAXCO           ← Sede 5 (11 de Julio 2026)
│
└── 📊 DASHBOARD       ← Hoja de resumen (opcional)
```

### Naming Convention

Los nombres de las hojas deben ser **EXACTAMENTE** en mayúsculas:

```
✅ GUANAJUATO
✅ PUEBLA
✅ GUADALAJARA
✅ IXTAPAN
✅ TAXCO

❌ Guanajuato
❌ guanajuato
❌ Guanajuato 2026
```

---

## Estructura de Columnas

Cada hoja tiene 14 columnas:

| # | Columna | Tipo | Descripción | Ejemplo |
|---|---------|------|-------------|---------|
| A | `FECHA` | Texto | Fecha de inscripción | `15/01/2026` |
| B | `ORDEN` | Texto | Número de orden Shopify | `1001` |
| C | `NOMBRE` | Texto | Nombre completo del corredor | `Juan Pérez García` |
| D | `EMAIL` | Texto | Correo electrónico | `juan@email.com` |
| E | `TELEFONO` | Texto | Teléfono móvil | `5512345678` |
| F | `FECHA DE NACIMIENTO` | Texto | Fecha de nacimiento | `1990-05-15` |
| G | `EQUIPO` | Texto | Nombre del equipo | `Team Scott` |
| H | `CATEGORIA` | Texto | Categoría de inscripción | `Elite Hombres` |
| I | `SEDE` | Texto | Producto/título del evento | `Inscripción SEDE 1 - Guanajuato 2026` |
| J | `EMERGENCIA NOMBRE` | Texto | Contacto de emergencia | `María López` |
| K | `EMERGENCIA TEL` | Texto | Teléfono de emergencia | `5587654321` |
| L | `QR_CODE` | Texto | Código único de check-in | `DHMEX-GTO-AB12CD34` |
| M | `CHECK_IN` | Texto | Estado de check-in | `SI` o `NO` |
| N | `CHECK_IN_TIME` | Texto | Fecha/hora del check-in | `15/01/2026, 08:30:45` |

### Visualización

```
┌────────────┬────────┬─────────────────┬──────────────────┬────────────┬───────────────────────┐
│    FECHA   │ ORDEN  │     NOMBRE      │      EMAIL       │  TELEFONO  │ FECHA DE NACIMIENTO   │
├────────────┼────────┼─────────────────┼──────────────────┼────────────┼───────────────────────┤
│ 15/01/2026 │ 1001   │ Juan Pérez      │ juan@email.com   │ 5512345678 │ 1990-05-15            │
│ 16/01/2026 │ 1002   │ María López     │ maria@email.com  │ 5598765432 │ 1985-08-20            │
│ 17/01/2026 │ 1003   │ Carlos Ramírez  │ carlos@email.com │ 5543218765 │ 1992-03-10            │
└────────────┴────────┴─────────────────┴──────────────────┴────────────┴───────────────────────┘

┌─────────────┬───────────────┬─────────────────────────────────────────┬────────────────────┐
│   EQUIPO    │  CATEGORIA    │                 SEDE                    │ EMERGENCIA NOMBRE  │
├─────────────┼───────────────┼─────────────────────────────────────────┼────────────────────┤
│ Team Scott  │ Elite Hombres │ Inscripción SEDE 1 - Guanajuato 2026    │ María López        │
│ Team Giant  │ Elite Mujeres │ Inscripción SEDE 1 - Guanajuato 2026    │ Pedro González     │
│ Independ.   │ Amateur Homb. │ Inscripción SEDE 1 - Guanajuato 2026    │ Ana Ramírez        │
└─────────────┴───────────────┴─────────────────────────────────────────┴────────────────────┘

┌────────────────────┬────────────────────┬──────────┬─────────────────────────┐
│ EMERGENCIA TEL     │      QR_CODE       │ CHECK_IN │     CHECK_IN_TIME       │
├────────────────────┼────────────────────┼──────────┼─────────────────────────┤
│ 5587654321         │ DHMEX-GTO-AB12CD34 │ SI       │ 15/01/2026, 08:30:45    │
│ 5576543210         │ DHMEX-GTO-XY78ZW12 │ NO       │                         │
│ 5565432109         │ DHMEX-GTO-MNPQ5678 │ SI       │ 15/01/2026, 09:15:22    │
└────────────────────┴────────────────────┴──────────┴─────────────────────────┘
```

---

## Crear el Spreadsheet

### Paso 1: Crear nuevo Spreadsheet

1. Ve a [Google Sheets](https://sheets.google.com)
2. Click en **Blank** (nuevo spreadsheet)
3. Renombrar a: `DHMEXRACES 2026`

### Paso 2: Crear hojas por sede

1. Click derecho en la pestaña `Sheet1` → **Rename** → `GUANAJUATO`
2. Click en **+** para agregar nueva hoja → `PUEBLA`
3. Repetir para: `GUADALAJARA`, `IXTAPAN`, `TAXCO`

### Paso 3: Agregar encabezados

En la fila 1 de cada hoja, agregar:

```
A1: FECHA
B1: ORDEN
C1: NOMBRE
D1: EMAIL
E1: TELEFONO
F1: FECHA DE NACIMIENTO
G1: EQUIPO
H1: CATEGORIA
I1: SEDE
J1: EMERGENCIA NOMBRE
K1: EMERGENCIA TEL
L1: QR_CODE
M1: CHECK_IN
N1: CHECK_IN_TIME
```

### Paso 4: Formatear encabezados

1. Seleccionar fila 1 (A1:N1)
2. **Format** → **Bold** (Ctrl+B)
3. **Format** → **Fill color** → Gris claro
4. **View** → **Freeze** → **1 row**

### Paso 5: Ajustar anchos de columna

1. Seleccionar todas las columnas (A:N)
2. Click derecho → **Resize columns**
3. Seleccionar **Fit to data**

---

## Configurar Google Cloud

### Paso 1: Crear proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Click en el selector de proyectos (arriba)
3. Click **New Project**
4. Nombre: `DHMEXRACES`
5. Click **Create**
6. Esperar a que se cree y seleccionarlo

### Paso 2: Habilitar Google Sheets API

1. En el menú lateral: **APIs & Services** → **Library**
2. Buscar: `Google Sheets API`
3. Click en el resultado
4. Click **Enable**
5. Esperar a que se habilite

### Paso 3: Verificar API habilitada

1. **APIs & Services** → **Enabled APIs**
2. Verificar que aparezca `Google Sheets API`

---

## Crear Cuenta de Servicio

### Paso 1: Ir a Credentials

1. **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service account**

### Paso 2: Crear cuenta

1. Service account name: `dhmexraces-sheets`
2. Service account ID: (se genera automáticamente)
3. Description: `Cuenta de servicio para webhooks de DHMEXRACES`
4. Click **Create and Continue**

### Paso 3: Asignar rol (opcional)

1. Rol: Dejar en blanco o seleccionar **Editor**
2. Click **Continue**

### Paso 4: Finalizar

1. Click **Done**

### Paso 5: Generar clave privada

1. Click en la cuenta de servicio recién creada
2. Tab **Keys**
3. Click **Add Key** → **Create new key**
4. Key type: **JSON**
5. Click **Create**
6. Se descarga un archivo `.json`

### Paso 6: Guardar credenciales

Del archivo JSON descargado, extraer:

```json
{
  "type": "service_account",
  "project_id": "dhmexraces-xxxxx",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n",
  "client_email": "dhmexraces-sheets@dhmexraces-xxxxx.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

Los valores importantes son:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

---

## Compartir Spreadsheet

**IMPORTANTE**: La cuenta de servicio necesita acceso al spreadsheet.

### Paso 1: Abrir el spreadsheet

1. Ve al spreadsheet en Google Sheets

### Paso 2: Compartir

1. Click **Share** (arriba a la derecha)
2. En "Add people and groups", pegar el email de la cuenta de servicio:
   ```
   dhmexraces-sheets@dhmexraces-xxxxx.iam.gserviceaccount.com
   ```
3. Cambiar permiso a: **Editor**
4. Desmarcar "Notify people"
5. Click **Share**

### Verificar acceso

La cuenta de servicio debería aparecer en la lista de personas con acceso.

---

## Variables de Entorno

### En Vercel

```bash
# Agregar email de cuenta de servicio
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
# Pegar: dhmexraces-sheets@dhmexraces-xxxxx.iam.gserviceaccount.com

# Agregar private key
vercel env add GOOGLE_PRIVATE_KEY
# Pegar: -----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n
```

### Formato de GOOGLE_PRIVATE_KEY

Los saltos de línea DEBEN ser `\n` literales:

```
✅ Correcto (una sola línea):
-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n...\n-----END PRIVATE KEY-----\n

❌ Incorrecto (saltos reales):
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhki...
...
-----END PRIVATE KEY-----
```

### Archivo .env local (para desarrollo)

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=dhmexraces-sheets@dhmexraces-xxxxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
```

---

## Código de Conexión

### Dependencia

```bash
npm install google-spreadsheet
```

### Conexión básica

```javascript
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

async function connectToSheets() {
  // Procesar private key (reemplazar \\n por \n real)
  let privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: privateKey,
  });

  await doc.loadInfo();
  console.log('Conectado a:', doc.title);

  return doc;
}
```

### Obtener hoja por nombre

```javascript
const doc = await connectToSheets();
const sheet = doc.sheetsByTitle['GUANAJUATO'];

if (!sheet) {
  throw new Error('Hoja GUANAJUATO no encontrada');
}
```

---

## Operaciones Comunes

### Leer todas las filas

```javascript
const sheet = doc.sheetsByTitle['GUANAJUATO'];
const rows = await sheet.getRows();

console.log(`Total de corredores: ${rows.length}`);

for (const row of rows) {
  console.log(`${row.NOMBRE} - ${row.CATEGORIA} - ${row.CHECK_IN}`);
}
```

### Agregar nueva fila

```javascript
await sheet.addRow({
  'FECHA': '15/01/2026',
  'ORDEN': '1001',
  'NOMBRE': 'Juan Pérez',
  'EMAIL': 'juan@email.com',
  'TELEFONO': '5512345678',
  'FECHA DE NACIMIENTO': '1990-05-15',
  'EQUIPO': 'Team Scott',
  'CATEGORIA': 'Elite Hombres',
  'SEDE': 'Inscripción SEDE 1 - Guanajuato 2026',
  'EMERGENCIA NOMBRE': 'María López',
  'EMERGENCIA TEL': '5587654321',
  'QR_CODE': 'DHMEX-GTO-AB12CD34',
  'CHECK_IN': 'NO',
  'CHECK_IN_TIME': ''
});
```

### Buscar fila por código QR

```javascript
const rows = await sheet.getRows();
const runner = rows.find(row => row.QR_CODE === 'DHMEX-GTO-AB12CD34');

if (runner) {
  console.log(`Encontrado: ${runner.NOMBRE}`);
}
```

### Actualizar fila

```javascript
// Encontrar la fila
const rows = await sheet.getRows();
const row = rows.find(r => r.QR_CODE === 'DHMEX-GTO-AB12CD34');

// Actualizar valores
row.CHECK_IN = 'SI';
row.CHECK_IN_TIME = '15/01/2026, 08:30:45';

// Guardar cambios
await row.save();
```

### Eliminar fila

```javascript
const rows = await sheet.getRows();
const row = rows.find(r => r.QR_CODE === 'DHMEX-GTO-AB12CD34');

if (row) {
  await row.delete();
}
```

### Contar inscritos

```javascript
const rows = await sheet.getRows();
const count = rows.filter(row => row.NOMBRE && row.NOMBRE.trim() !== '').length;
console.log(`Inscritos: ${count}`);
```

### Contar check-ins

```javascript
const rows = await sheet.getRows();
const checkedIn = rows.filter(row => row.CHECK_IN === 'SI').length;
console.log(`Check-ins: ${checkedIn}`);
```

---

## Fórmulas Útiles

Agregar en una hoja `DASHBOARD`:

### Contar inscritos total

```excel
=COUNTA(GUANAJUATO!C:C) + COUNTA(PUEBLA!C:C) + COUNTA(GUADALAJARA!C:C) + COUNTA(IXTAPAN!C:C) + COUNTA(TAXCO!C:C) - 5
```

### Contar inscritos por sede

```excel
=COUNTA(GUANAJUATO!C:C) - 1
```

### Contar inscritos por categoría

```excel
=COUNTIF(GUANAJUATO!H:H, "Elite Hombres")
```

### Contar check-ins completados

```excel
=COUNTIF(GUANAJUATO!M:M, "SI")
```

### Porcentaje de check-in

```excel
=COUNTIF(GUANAJUATO!M:M, "SI") / (COUNTA(GUANAJUATO!C:C) - 1) * 100
```

### Listar equipos únicos

```excel
=UNIQUE(GUANAJUATO!G2:G)
```

### Contar corredores por equipo

```excel
=COUNTIF(GUANAJUATO!G:G, "Team Scott")
```

---

## Dashboard de Estadísticas

Crear una hoja `DASHBOARD` con resumen:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DASHBOARD DHMEXRACES 2026                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  RESUMEN GENERAL                                                    │   │
│  ├──────────────┬─────────────┬─────────────┬─────────────┬────────────┤   │
│  │ Total        │ Guanajuato  │ Puebla      │ Guadalajara │ Ixtapan    │   │
│  │ Inscritos    │ Inscritos   │ Inscritos   │ Inscritos   │ Inscritos  │   │
│  ├──────────────┼─────────────┼─────────────┼─────────────┼────────────┤   │
│  │     135      │     45      │     30      │     25      │     20     │   │
│  └──────────────┴─────────────┴─────────────┴─────────────┴────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CHECK-IN (Día del evento)                                          │   │
│  ├──────────────┬─────────────┬─────────────┬─────────────────────────┤   │
│  │ Sede         │ Registrados │ Check-in    │ Pendientes              │   │
│  ├──────────────┼─────────────┼─────────────┼─────────────────────────┤   │
│  │ GUANAJUATO   │     45      │     32      │     13                  │   │
│  │ PUEBLA       │     30      │     --      │     30                  │   │
│  │ GUADALAJARA  │     25      │     --      │     25                  │   │
│  └──────────────┴─────────────┴─────────────┴─────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POR CATEGORÍA (Guanajuato)                                         │   │
│  ├──────────────────────┬──────────────────────────────────────────────┤   │
│  │ Elite Hombres        │     15                                       │   │
│  │ Elite Mujeres        │      8                                       │   │
│  │ Master 30+ Hombres   │     12                                       │   │
│  │ Master 30+ Mujeres   │      5                                       │   │
│  │ Amateur Hombres      │     25                                       │   │
│  │ Amateur Mujeres      │     10                                       │   │
│  └──────────────────────┴──────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fórmulas del Dashboard

| Celda | Fórmula |
|-------|---------|
| Total Inscritos | `=COUNTA(GUANAJUATO!C:C)+COUNTA(PUEBLA!C:C)+...` |
| Guanajuato Inscritos | `=COUNTA(GUANAJUATO!C:C)-1` |
| Guanajuato Check-in | `=COUNTIF(GUANAJUATO!M:M,"SI")` |
| Guanajuato Pendientes | `=COUNTA(GUANAJUATO!C:C)-1-COUNTIF(GUANAJUATO!M:M,"SI")` |
| Elite Hombres | `=COUNTIF(GUANAJUATO!H:H,"Elite Hombres")` |

---

## Backup y Seguridad

### Backup automático (versiones)

Google Sheets guarda automáticamente cada cambio:

1. **File** → **Version history** → **See version history**
2. Ver todas las versiones anteriores
3. Restaurar si es necesario

### Exportar datos

1. **File** → **Download** → **Comma-separated values (.csv)**
2. O **File** → **Download** → **Microsoft Excel (.xlsx)**

### Exportar vía API

```javascript
const rows = await sheet.getRows();
const csv = rows.map(row => {
  return `${row.NOMBRE},${row.EMAIL},${row.CATEGORIA}`;
}).join('\n');

// Guardar en archivo
fs.writeFileSync('backup.csv', csv);
```

### Proteger hojas

1. Click derecho en la pestaña de la hoja
2. **Protect sheet**
3. Configurar quién puede editar

### Proteger rangos específicos

1. Seleccionar rango (ej: A1:N1 encabezados)
2. **Data** → **Protect sheets and ranges**
3. Configurar permisos

---

## Troubleshooting

### "The caller does not have permission"

**Causa**: La cuenta de servicio no tiene acceso al spreadsheet.

**Solución**:
1. Abrir spreadsheet
2. Click **Share**
3. Agregar el email de la cuenta de servicio como **Editor**

### "Hoja no encontrada"

**Causa**: El nombre de la hoja no coincide exactamente.

**Solución**:
1. Verificar nombre exacto de la hoja (MAYÚSCULAS)
2. Los nombres válidos son: `GUANAJUATO`, `PUEBLA`, `GUADALAJARA`, `IXTAPAN`, `TAXCO`

### "Invalid grant"

**Causa**: La private key está mal formateada.

**Solución**:
1. Verificar que los `\n` sean literales
2. Regenerar la clave si es necesario
3. En Vercel, actualizar `GOOGLE_PRIVATE_KEY`

### "Spreadsheet not found"

**Causa**: El ID del spreadsheet es incorrecto.

**Solución**:
1. Verificar el ID en la URL del spreadsheet
2. Verificar que el spreadsheet exista

### Filas duplicadas

**Causa**: El webhook se ejecutó dos veces.

**Solución**:
1. Agregar validación antes de insertar:
   ```javascript
   const existing = rows.find(r => r.ORDEN === orderNumber);
   if (existing) {
     console.log('Orden ya registrada');
     return;
   }
   ```

### Datos no se guardan

**Causa**: Error de conexión o credenciales.

**Solución**:
1. Verificar logs de Vercel
2. Verificar credenciales de Google
3. Verificar que la API esté habilitada

### Timeout al leer muchas filas

**Causa**: Demasiadas filas para procesar.

**Solución**:
1. Optimizar código (filtrar antes de procesar)
2. Usar paginación
3. Considerar una base de datos diferente para grandes volúmenes

---

## Resumen Rápido

### Checklist de Configuración

```
✅ Crear spreadsheet en Google Sheets
✅ Crear hojas: GUANAJUATO, PUEBLA, GUADALAJARA, IXTAPAN, TAXCO
✅ Agregar encabezados (14 columnas)
✅ Crear proyecto en Google Cloud
✅ Habilitar Google Sheets API
✅ Crear cuenta de servicio
✅ Generar clave privada (JSON)
✅ Compartir spreadsheet con cuenta de servicio
✅ Configurar variables de entorno en Vercel
✅ Probar conexión
```

### Código Mínimo

```javascript
const { GoogleSpreadsheet } = require('google-spreadsheet');

const doc = new GoogleSpreadsheet('TU_SPREADSHEET_ID');
await doc.useServiceAccountAuth({
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
});
await doc.loadInfo();

const sheet = doc.sheetsByTitle['GUANAJUATO'];
const rows = await sheet.getRows();
```
