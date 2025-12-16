# Sistema de Confirmación de Emails Individuales - DHMEXRACES

## 📧 Descripción

Sistema para enviar emails de confirmación individuales a cada corredor registrado en una compra, además del email de confirmación estándar al comprador.

---

## 🔄 Flujo del Sistema

### Paso 1: Captura de Datos
Cuando un usuario completa el formulario de registro (`/pages/registration-form`):
- Se capturan los datos de CADA corredor (nombre, email, teléfono, fecha nacimiento, equipo, categoría)
- Los datos se guardan en `cart.attributes.registration_data` como JSON
- Formato:
```json
{
  "registrations": [
    {
      "variant_id": "123456",
      "variant_title": "Elite Hombres",
      "product_title": "Inscripción SEDE 1 - Guanajuato 2026",
      "nombre": "Juan Pérez García",
      "fecha_nacimiento": "1990-05-15",
      "equipo": "Team Scott",
      "email": "juan@ejemplo.com",
      "telefono": "5512345678",
      "categoria": "Elite Hombres"
    },
    {
      "variant_id": "123456",
      "variant_title": "Amateur Mujeres",
      "product_title": "Inscripción SEDE 1 - Guanajuato 2026",
      "nombre": "María González",
      "fecha_nacimiento": "1995-03-20",
      "equipo": "Shimano Racing",
      "email": "maria@ejemplo.com",
      "telefono": "5523456789",
      "categoria": "Amateur Mujeres"
    }
  ],
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

### Paso 2: Al Completar el Checkout
Los datos se transfieren al pedido (Order) en Shopify como `order.attributes.registration_data`

### Paso 3: Envío de Emails
Se necesita un sistema automático que:
1. Detecte cuando se crea un nuevo pedido (webhook `orders/create`)
2. Extraiga `order.attributes.registration_data`
3. Parse el JSON para obtener el array de corredores
4. Envíe un email individual a cada corredor con su confirmación
5. El email estándar del pedido va al comprador automáticamente

---

## 🛠️ Opciones de Implementación

### Opción 1: Shopify Flow (Requiere Shopify Plus)

**Ventajas:**
- Nativo de Shopify
- Visual workflow builder
- No requiere código externo

**Configuración:**
1. Ir a Shopify Admin → Apps → Flow
2. Crear un nuevo workflow
3. Trigger: "Order created"
4. Condition: "Order has attribute 'registration_data'"
5. Action: "Send email" (repetir por cada corredor usando loop)

**Limitación:** Shopify Flow no permite loops dinámicos sobre arrays JSON nativamente.

---

### Opción 2: Webhook + Zapier/Make.com (RECOMENDADO)

**Ventajas:**
- No requiere Shopify Plus
- Fácil de configurar
- Visual workflow
- Puede usar Gmail, SendGrid, Mailgun, etc.

#### Configuración con Zapier:

1. **Crear Webhook en Shopify:**
   - Ir a Settings → Notifications → Webhooks
   - Create webhook
   - Event: `Order creation`
   - Format: `JSON`
   - URL: (copiar de Zapier)

2. **Crear Zap en Zapier:**
   - Trigger: Webhooks by Zapier → "Catch Hook"
   - Copiar webhook URL a Shopify
   - Test: Hacer un pedido de prueba

3. **Parsear JSON:**
   - Action: Code by Zapier → "Run JavaScript"
   - Código:
   ```javascript
   const orderData = inputData.order;
   const registrationData = JSON.parse(orderData.note_attributes.find(attr => attr.name === 'registration_data')?.value || '{}');

   return {
     registrations: registrationData.registrations || [],
     buyerEmail: orderData.email,
     orderNumber: orderData.order_number
   };
   ```

4. **Loop sobre corredores:**
   - Action: Looping by Zapier
   - Loop sobre: `registrations`

5. **Enviar email a cada corredor:**
   - Action: Gmail / SendGrid / Email by Zapier
   - To: `{{corredor.email}}`
   - Subject: "Confirmación de Inscripción - DHMEXRACES 2026"
   - Body: (usar plantilla HTML)

6. **Enviar email al comprador (opcional):**
   - Action final: Email summary al comprador

---

### Opción 3: Webhook + Script Personalizado (Node.js/Python)

**Ventajas:**
- Control total
- Más barato a largo plazo
- Puede integrar con cualquier servicio de email

**Configuración:**

1. **Crear servidor que reciba webhooks:**
```javascript
// server.js (Node.js + Express)
const express = require('express');
const nodemailer = require('nodemailer');
const app = express();

app.post('/webhook/order-created', express.json(), async (req, res) => {
  const order = req.body;

  // Extraer registration_data
  const registrationAttr = order.note_attributes?.find(attr => attr.name === 'registration_data');
  if (!registrationAttr) {
    return res.status(200).send('No registration data');
  }

  const registrationData = JSON.parse(registrationAttr.value);
  const corredores = registrationData.registrations || [];

  // Configurar transportador de email
  const transporter = nodemailer.createTransport({
    service: 'gmail', // o SendGrid, Mailgun, etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Enviar email a cada corredor
  for (const corredor of corredores) {
    await transporter.sendMail({
      from: 'noreply@dhmexraces.com',
      to: corredor.email,
      subject: `Confirmación de Inscripción - ${corredor.categoria}`,
      html: generarPlantillaEmail(corredor, order)
    });
  }

  res.status(200).send('Emails sent');
});

app.listen(3000);
```

2. **Desplegar servidor:**
   - Heroku, Railway, Vercel, AWS Lambda, etc.

3. **Configurar webhook en Shopify:**
   - URL: `https://tu-servidor.com/webhook/order-created`

---

## 📧 Plantilla de Email para Corredor

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #000000;
      color: #FFFFFF;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      width: 150px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 2rem;
      font-weight: 900;
      background: linear-gradient(135deg, #FF4D00, #FFB800);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 10px 0;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 77, 0, 0.3);
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .info-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
    }
    .info-value {
      color: #FFFFFF;
      font-weight: 600;
    }
    .highlight {
      color: #FFB800;
      font-weight: 700;
    }
    .footer {
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.875rem;
      margin-top: 40px;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #FF4D00, #FFB800);
      color: #000;
      font-weight: 700;
      border-radius: 8px;
      text-decoration: none;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Inscripción Confirmada!</h1>
      <p>COPA SCOTT DHMEXRACES 2026</p>
    </div>

    <div class="card">
      <h2 style="color: #FF4D00; margin-top: 0;">Datos del Corredor</h2>
      <div class="info-row">
        <span class="info-label">Nombre:</span>
        <span class="info-value">{{NOMBRE_CORREDOR}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Categoría:</span>
        <span class="info-value highlight">{{CATEGORIA}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Equipo:</span>
        <span class="info-value">{{EQUIPO}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">{{EMAIL}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Teléfono:</span>
        <span class="info-value">{{TELEFONO}}</span>
      </div>
    </div>

    <div class="card">
      <h2 style="color: #FF4D00; margin-top: 0;">Información del Evento</h2>
      <div class="info-row">
        <span class="info-label">Sede:</span>
        <span class="info-value">{{SEDE}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha:</span>
        <span class="info-value">{{FECHA_EVENTO}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Número de Pedido:</span>
        <span class="info-value">#{{ORDER_NUMBER}}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <p style="color: rgba(255, 255, 255, 0.8); font-size: 1.125rem;">
        Nos vemos en la pista! 🏁
      </p>
      <a href="https://dhmexraces1.myshopify.com/pages/ranking" class="btn">
        Ver Ranking
      </a>
    </div>

    <div class="footer">
      <p>COPA SCOTT DHMEXRACES 2026</p>
      <p>El campeonato nacional de downhill MTB más grande de México</p>
      <p>$500,000 MXN en premios totales • 5 sedes • 13 categorías</p>
    </div>
  </div>
</body>
</html>
```

**Variables a reemplazar:**
- `{{NOMBRE_CORREDOR}}` - Del JSON: `corredor.nombre`
- `{{CATEGORIA}}` - Del JSON: `corredor.categoria`
- `{{EQUIPO}}` - Del JSON: `corredor.equipo` (o "Sin equipo")
- `{{EMAIL}}` - Del JSON: `corredor.email`
- `{{TELEFONO}}` - Del JSON: `corredor.telefono`
- `{{SEDE}}` - Del JSON: `corredor.product_title`
- `{{FECHA_EVENTO}}` - Según la sede (hardcoded o extraer de producto)
- `{{ORDER_NUMBER}}` - Del order: `order.order_number`

---

## 📧 Plantilla de Email para Comprador

Shopify ya envía automáticamente el email de confirmación al comprador. Si quieres personalizar:

**Shopify Admin → Settings → Notifications → Order confirmation**

Agregar al final del template:

```liquid
{% if order.attributes.registration_data %}
  <h2>Corredores Registrados</h2>
  {% assign reg_data = order.attributes.registration_data | parse_json %}
  {% for corredor in reg_data.registrations %}
    <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px;">
      <strong>Participante {{ forloop.index }}:</strong> {{ corredor.nombre }}<br>
      Categoría: {{ corredor.categoria }}<br>
      Email: {{ corredor.email }}<br>
      Teléfono: {{ corredor.telefono }}
    </div>
  {% endfor %}

  <p><em>Cada corredor recibirá un email de confirmación individual a su correo registrado.</em></p>
{% endif %}
```

---

## ✅ Checklist de Implementación

### Preparación:
- [ ] Confirmar que los datos se guardan en `cart.attributes.registration_data`
- [ ] Hacer pedido de prueba y verificar que aparece en el Order como `order.attributes.registration_data`

### Opción Zapier (Recomendada):
- [ ] Crear cuenta en Zapier.com
- [ ] Crear Zap con trigger "Webhooks by Zapier"
- [ ] Copiar webhook URL
- [ ] Crear webhook en Shopify Admin → Settings → Notifications → Webhooks
- [ ] Configurar parser de JSON en Zapier
- [ ] Configurar loop sobre `registrations`
- [ ] Configurar envío de email (Gmail, SendGrid, etc.)
- [ ] Probar con pedido real

### Personalizar Emails:
- [ ] Crear plantilla HTML para email de corredor
- [ ] Crear plantilla HTML para resumen al comprador (opcional)
- [ ] Configurar remitente (from email)
- [ ] Configurar subject lines

### Testing:
- [ ] Hacer pedido de prueba con 1 inscripción
- [ ] Verificar que llega email al corredor
- [ ] Hacer pedido de prueba con 3 inscripciones
- [ ] Verificar que llegan 3 emails individuales
- [ ] Verificar que el comprador recibe su confirmación de Shopify

---

## 🆘 Troubleshooting

**Problema:** Los webhooks no se disparan
- Verificar que el webhook está activo en Shopify
- Verificar que el URL es HTTPS
- Revisar los logs en Shopify Admin → Settings → Notifications → Webhooks

**Problema:** No se encuentra `registration_data`
- Verificar en un pedido real que `order.attributes` o `order.note_attributes` contiene la data
- Shopify puede guardar como `note_attributes` en vez de `attributes`

**Problema:** JSON no parsea correctamente
- Verificar el formato del JSON guardado
- Usar `console.log()` en Zapier Code step para debug

**Problema:** Emails no llegan
- Verificar configuración SMTP/API del servicio de email
- Revisar spam folder
- Verificar que los emails de los corredores son válidos

---

## 💰 Costos Estimados

### Zapier:
- Plan Starter: $19.99/mes (750 tasks/mes)
- Estimado: 1 pedido con 4 inscripciones = ~6 tasks (webhook + parse + 4 emails)
- Capacidad: ~125 pedidos/mes con promedio 4 inscripciones

### SendGrid:
- Plan Free: 100 emails/día gratis
- Plan Essentials: $19.95/mes para 50,000 emails

### Make.com (alternativa a Zapier):
- Plan Free: 1,000 operaciones/mes
- Plan Core: $9/mes para 10,000 operaciones/mes

---

## 📞 Soporte

Para configuración y troubleshooting:
- GitHub Issues: https://github.com/PRAZIS-TECHNOLOGIES/DHMEXRACES-SHOPIFY/issues
- Documentación Shopify Webhooks: https://shopify.dev/docs/api/admin-rest/2024-01/resources/webhook
- Zapier Webhooks: https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks

---

**Última actualización:** 15 Noviembre 2025 - V.3
