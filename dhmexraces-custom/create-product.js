// Script para crear el producto de Guanajuato
const https = require('https');

const shopDomain = 'dhmexraces1.myshopify.com';
const accessToken = process.env.SHOPIFY_CLI_THEME_TOKEN;

const productData = {
  product: {
    title: "Inscripción SEDE 1 - Guanajuato 2026",
    body_html: "<p>Apertura épica de la temporada COPA SCOTT DHMEXRACES 2026</p><p><strong>Fecha:</strong> 21-22 Febrero 2026<br><strong>Ubicación:</strong> Guanajuato, México<br><strong>Premios:</strong> +$100,000 MXN</p><p>✓ Mecánica Neutral Shimano<br>✓ Puntos para campeonato nacional<br>✓ Premios en efectivo</p>",
    vendor: "DHMEXRACES",
    product_type: "Race Registration",
    handle: "inscripcion-guanajuato-2026",
    status: "active",
    published_scope: "web",
    variants: [
      {
        option1: "Elite Hombres",
        price: "1300.00",
        sku: "GTO-2026-ELITE-H",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Elite Mujeres",
        price: "1300.00",
        sku: "GTO-2026-ELITE-M",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Sub-Elite Hombres",
        price: "1300.00",
        sku: "GTO-2026-SUBELITE-H",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Sub-Elite Mujeres",
        price: "1300.00",
        sku: "GTO-2026-SUBELITE-M",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Master A",
        price: "1300.00",
        sku: "GTO-2026-MASTER-A",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Master B",
        price: "1300.00",
        sku: "GTO-2026-MASTER-B",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Master C",
        price: "1300.00",
        sku: "GTO-2026-MASTER-C",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Juvenil 17-18",
        price: "1300.00",
        sku: "GTO-2026-JUV-17-18",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Juvenil 15-16",
        price: "1300.00",
        sku: "GTO-2026-JUV-15-16",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Juvenil 13-14",
        price: "1300.00",
        sku: "GTO-2026-JUV-13-14",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Infantil 11-12",
        price: "1300.00",
        sku: "GTO-2026-INF-11-12",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Infantil 9-10",
        price: "1300.00",
        sku: "GTO-2026-INF-9-10",
        inventory_management: null,
        inventory_quantity: 999
      },
      {
        option1: "Principiantes",
        price: "1300.00",
        sku: "GTO-2026-PRIN",
        inventory_management: null,
        inventory_quantity: 999
      }
    ],
    options: [
      {
        name: "Categoría",
        position: 1,
        values: [
          "Elite Hombres",
          "Elite Mujeres",
          "Sub-Elite Hombres",
          "Sub-Elite Mujeres",
          "Master A",
          "Master B",
          "Master C",
          "Juvenil 17-18",
          "Juvenil 15-16",
          "Juvenil 13-14",
          "Infantil 11-12",
          "Infantil 9-10",
          "Principiantes"
        ]
      }
    ]
  }
};

const postData = JSON.stringify(productData);

const options = {
  hostname: shopDomain,
  path: '/admin/api/2024-01/products.json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'X-Shopify-Access-Token': accessToken
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201) {
      const product = JSON.parse(data);
      console.log('✅ Producto creado exitosamente!');
      console.log(`ID: ${product.product.id}`);
      console.log(`Handle: ${product.product.handle}`);
      console.log(`URL: https://${shopDomain}/products/${product.product.handle}`);
    } else {
      console.error('❌ Error al crear producto:', res.statusCode);
      console.error(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.write(postData);
req.end();
