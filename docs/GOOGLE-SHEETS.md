# Google Sheets - Base de Datos DHMEXRACES

Guía de configuración y uso de Google Sheets como base de datos de corredores.

## Spreadsheet Principal

**ID**: `1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg`

**URL**: `https://docs.google.com/spreadsheets/d/1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg`

## Estructura del Spreadsheet

El spreadsheet tiene una hoja por cada sede del campeonato:

```
📊 DHMEXRACES 2026
├── GUANAJUATO
├── PUEBLA
├── GUADALAJARA
├── IXTAPAN
└── TAXCO
```

## Estructura de Columnas

Cada hoja tiene las siguientes columnas:

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `FECHA` | Texto | Fecha de inscripción | `15/01/2026` |
| `ORDEN` | Texto | Número de orden Shopify | `1001` |
| `NOMBRE` | Texto | Nombre completo | `Juan Pérez García` |
| `EMAIL` | Texto | Correo electrónico | `juan@email.com` |
| `TELEFONO` | Texto | Teléfono de contacto | `5512345678` |
| `FECHA DE NACIMIENTO` | Texto | Fecha de nacimiento | `1990-05-15` |
| `EQUIPO` | Texto | Nombre del equipo | `Team Scott` |
| `CATEGORIA` | Texto | Categoría de inscripción | `Elite Hombres` |
| `SEDE` | Texto | Producto/evento | `Inscripción SEDE 1 - Guanajuato 2026` |
| `EMERGENCIA NOMBRE` | Texto | Contacto de emergencia | `María López` |
| `EMERGENCIA TEL` | Texto | Teléfono de emergencia | `5587654321` |
| `QR_CODE` | Texto | Código único de check-in | `DHMEX-GTO-AB12CD34` |
| `CHECK_IN` | Texto | Estado de check-in | `SI` / `NO` |
| `CHECK_IN_TIME` | Texto | Fecha y hora del check-in | `15/01/2026, 08:30:45` |

## Crear la Hoja de Cálculo

### 1. Crear nuevo Spreadsheet

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crear nuevo spreadsheet
3. Nombrarlo: `DHMEXRACES 2026`

### 2. Crear hojas por sede

Renombrar `Sheet1` a `GUANAJUATO` y crear hojas adicionales:
- `PUEBLA`
- `GUADALAJARA`
- `IXTAPAN`
- `TAXCO`

### 3. Agregar encabezados

En la fila 1 de cada hoja:

```
FECHA | ORDEN | NOMBRE | EMAIL | TELEFONO | FECHA DE NACIMIENTO | EQUIPO | CATEGORIA | SEDE | EMERGENCIA NOMBRE | EMERGENCIA TEL | QR_CODE | CHECK_IN | CHECK_IN_TIME
```

### 4. Formatear encabezados

- Seleccionar fila 1
- Negrita
- Color de fondo: Gris claro
- Congelar fila 1: **View** → **Freeze** → **1 row**

---

## Configurar Cuenta de Servicio

### 1. Crear proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crear nuevo proyecto: `DHMEXRACES`
3. Seleccionar el proyecto

### 2. Habilitar Google Sheets API

1. Ve a **APIs & Services** → **Library**
2. Buscar "Google Sheets API"
3. Click **Enable**

### 3. Crear cuenta de servicio

1. Ve a **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service account**
3. Nombre: `dhmexraces-sheets`
4. Click **Create and Continue**
5. Rol: **Editor** (o sin rol)
6. Click **Done**

### 4. Generar clave privada

1. Click en la cuenta de servicio creada
2. Tab **Keys** → **Add Key** → **Create new key**
3. Tipo: **JSON**
4. Descargar el archivo JSON

### 5. Extraer credenciales

Del archivo JSON descargado:

```json
{
  "client_email": "dhmexraces@proyecto.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Estos valores van en las variables de entorno de Vercel.

---

## Compartir Spreadsheet

**Importante**: La cuenta de servicio necesita acceso al spreadsheet.

1. Abrir el spreadsheet en Google Sheets
2. Click **Share** (Compartir)
3. Agregar el email de la cuenta de servicio:
   ```
   dhmexraces@proyecto.iam.gserviceaccount.com
   ```
4. Permiso: **Editor**
5. Click **Send** / **Share**

---

## Variables de Entorno

En Vercel, configurar:

### `GOOGLE_SERVICE_ACCOUNT_EMAIL`

```
dhmexraces@proyecto.iam.gserviceaccount.com
```

### `GOOGLE_PRIVATE_KEY`

```
-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n
```

**Nota**: Los saltos de línea deben ser `\n` literales, no saltos reales.

---

## Código de Conexión

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

// Obtener hoja por nombre
const sheet = doc.sheetsByTitle['GUANAJUATO'];

// Leer todas las filas
const rows = await sheet.getRows();

// Agregar nueva fila
await sheet.addRow({
  'FECHA': '15/01/2026',
  'ORDEN': '1001',
  'NOMBRE': 'Juan Pérez',
  // ... etc
});

// Actualizar una fila
row.CHECK_IN = 'SI';
row.CHECK_IN_TIME = '15/01/2026, 08:30:45';
await row.save();
```

---

## Fórmulas Útiles

### Contar inscritos por categoría

```excel
=COUNTIF(H:H, "Elite Hombres")
```

### Contar check-ins completados

```excel
=COUNTIF(M:M, "SI")
```

### Porcentaje de check-in

```excel
=COUNTIF(M:M, "SI") / COUNTA(C:C) * 100
```

### Listar equipos únicos

```excel
=UNIQUE(G2:G)
```

---

## Dashboard en Google Sheets

Crear una hoja `DASHBOARD` con resumen:

```
| Sede       | Inscritos | Check-in | Pendientes | % |
|------------|-----------|----------|------------|---|
| GUANAJUATO | =COUNTA(GUANAJUATO!C:C)-1 | =COUNTIF(GUANAJUATO!M:M,"SI") | ... | ... |
| PUEBLA     | ... | ... | ... | ... |
```

---

## Backup y Seguridad

### Backup automático

1. **File** → **Version history** → **See version history**
2. Google Sheets guarda automáticamente cada cambio

### Exportar datos

1. **File** → **Download** → **Comma-separated values (.csv)**
2. O usar la API para exportar programáticamente

### Proteger hojas

1. Click derecho en la pestaña de la hoja
2. **Protect sheet**
3. Configurar permisos de edición

---

## Troubleshooting

### "The caller does not have permission"

1. Verificar que la cuenta de servicio tenga acceso al spreadsheet
2. Verificar el email exacto de la cuenta de servicio
3. Verificar que el spreadsheet ID sea correcto

### "Hoja no encontrada"

1. Verificar nombre exacto de la hoja (mayúsculas)
2. Los nombres son: `GUANAJUATO`, `PUEBLA`, `GUADALAJARA`, `IXTAPAN`, `TAXCO`

### "Invalid grant"

1. Verificar que la private key esté correctamente formateada
2. Los `\n` deben ser literales en la variable de entorno
3. Regenerar la clave si es necesario

### Filas duplicadas

1. Verificar lógica de webhook
2. Agregar validación de orden existente antes de insertar
