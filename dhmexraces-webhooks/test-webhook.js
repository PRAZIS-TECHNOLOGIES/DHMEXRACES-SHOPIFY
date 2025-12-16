// Script para probar el webhook con múltiples corredores
// Ejecutar: node test-webhook.js

const https = require('https');

// Simular un pedido de Shopify con múltiples corredores
const testOrder = {
  id: 123456789,
  order_number: "TEST-001",
  name: "#TEST-001",
  note_attributes: [
    {
      name: "registration_data",
      value: JSON.stringify({
        registrations: [
          {
            variant_id: "123",
            variant_title: "Elite Hombres",
            product_title: "Inscripción Sede 2 - Puebla",
            nombre: "Gibrán Gómez",
            fecha_nacimiento: "1990-05-15",
            equipo: "Team Scott México",
            email: "gibrangoc15@gmail.com",
            telefono: "5512345678",
            emergencia_nombre: "María Gómez",
            emergencia_telefono: "5511112222",
            categoria: "Elite Hombres"
          },
          {
            variant_id: "124",
            variant_title: "Femenil",
            product_title: "Inscripción Sede 2 - Puebla",
            nombre: "Rider Fox",
            fecha_nacimiento: "1995-08-20",
            equipo: "Fox Racing",
            email: "ridefoxstore@gmail.com",
            telefono: "5598765432",
            emergencia_nombre: "Juan Fox",
            emergencia_telefono: "5533334444",
            categoria: "Femenil"
          }
        ],
        timestamp: new Date().toISOString()
      })
    }
  ],
  email: "comprador@ejemplo.com",
  customer: {
    email: "comprador@ejemplo.com",
    first_name: "Comprador",
    last_name: "Test"
  }
};

const postData = JSON.stringify(testOrder);

const options = {
  hostname: 'dhmexraces-webhooks.vercel.app',
  port: 443,
  path: '/api/order-created',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🚀 Enviando pedido de prueba con 2 corredores...\n');
console.log('📋 Corredores en el pedido:');
const registrations = JSON.parse(testOrder.note_attributes[0].value).registrations;
registrations.forEach((r, i) => {
  console.log(`   ${i + 1}. ${r.nombre} (${r.categoria}) - ${r.email}`);
});
console.log('\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📨 Status:', res.statusCode);
    console.log('📨 Response RAW:', data);
    try {
      console.log('📨 Response JSON:', JSON.parse(data));
    } catch (e) {
      console.log('📨 No es JSON válido');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
});

req.write(postData);
req.end();
