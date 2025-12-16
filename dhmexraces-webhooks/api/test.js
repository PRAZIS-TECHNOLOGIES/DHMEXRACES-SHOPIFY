// Endpoint de prueba para verificar que el servidor funciona
module.exports = async function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    message: 'DHMEXRACES Webhook Server is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      orderCreated: '/api/order-created',
      test: '/api/test'
    }
  });
};
