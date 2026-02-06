const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - Inscripción Manual | DHMEXRACES</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000000;
      color: #ffffff;
      min-height: 100vh;
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

    .header h1 {
      color: #E42C2C;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: 2px;
    }

    .header p {
      color: rgba(255,255,255,0.7);
      margin-top: 8px;
    }

    .login-section {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
    }

    .login-section h2 {
      margin-bottom: 20px;
      font-size: 1.25rem;
    }

    .login-section input {
      width: 100%;
      max-width: 300px;
      padding: 14px 16px;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: #fff;
      font-size: 1rem;
      margin-bottom: 16px;
    }

    .login-section button {
      padding: 14px 40px;
      background: #E42C2C;
      color: #000;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
    }

    .login-section button:hover {
      background: #ff4444;
      transform: translateY(-2px);
    }

    .form-section {
      display: none;
    }

    .form-section.active {
      display: block;
    }

    .form-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 20px;
    }

    .form-card h3 {
      color: #E42C2C;
      margin-bottom: 20px;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    label {
      display: block;
      color: rgba(255,255,255,0.8);
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    input, select {
      width: 100%;
      padding: 14px 16px;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      color: #fff;
      font-size: 1rem;
      transition: all 0.3s;
    }

    input:focus, select:focus {
      outline: none;
      border-color: #E42C2C;
      box-shadow: 0 0 0 3px rgba(228,44,44,0.1);
    }

    select {
      cursor: pointer;
    }

    select option {
      background: #1a1a1a;
      color: #fff;
    }

    .jersey-section {
      background: linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%);
      border: 1px solid rgba(34,197,94,0.3);
      border-radius: 12px;
      padding: 20px;
      margin-top: 10px;
    }

    .jersey-section.no-disponible {
      background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%);
      border-color: rgba(239,68,68,0.3);
    }

    .jersey-section label {
      color: #22C55E;
    }

    .jersey-section.no-disponible label {
      color: #EF4444;
    }

    .jersey-info {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.7);
      margin-bottom: 12px;
    }

    .submit-btn {
      width: 100%;
      padding: 18px;
      background: #E42C2C;
      color: #000;
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.3s;
    }

    .submit-btn:hover {
      background: #ff4444;
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(228,44,44,0.3);
    }

    .submit-btn:disabled {
      background: #555;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .result {
      margin-top: 20px;
      padding: 20px;
      border-radius: 12px;
      display: none;
    }

    .result.success {
      display: block;
      background: rgba(34,197,94,0.1);
      border: 1px solid rgba(34,197,94,0.3);
    }

    .result.error {
      display: block;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
    }

    .result h4 {
      margin-bottom: 10px;
    }

    .result.success h4 {
      color: #22C55E;
    }

    .result.error h4 {
      color: #EF4444;
    }

    .result p {
      color: rgba(255,255,255,0.8);
      margin: 5px 0;
    }

    .result .code {
      font-family: monospace;
      font-size: 1.2rem;
      color: #fff;
      background: rgba(0,0,0,0.3);
      padding: 8px 12px;
      border-radius: 6px;
      display: inline-block;
      margin-top: 5px;
    }

    .logout-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .logout-btn:hover {
      background: rgba(255,255,255,0.2);
    }

    .new-btn {
      margin-top: 15px;
      padding: 12px 24px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .new-btn:hover {
      background: rgba(255,255,255,0.2);
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .container {
        padding: 20px 16px;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    <div class="header">
      <h1>DHMEXRACES</h1>
      <p>Panel de Inscripcion Manual</p>
    </div>

    <div class="login-section" id="loginSection">
      <h2>Acceso Admin</h2>
      <input type="password" id="passwordInput" placeholder="Contraseña" onkeypress="if(event.key==='Enter')login()">
      <br>
      <button onclick="login()">Entrar</button>
    </div>

    <div class="form-section" id="formSection">
      <button class="logout-btn" onclick="logout()">Cerrar Sesion</button>

      <form id="registrationForm" onsubmit="submitForm(event)">

        <div class="form-card">
          <h3>Sede y Categoria</h3>

          <div class="form-row">
            <div class="form-group">
              <label>Sede *</label>
              <select id="sede" required onchange="checkJerseyAvailability()">
                <option value="">Selecciona...</option>
                <option value="guanajuato">Guanajuato</option>
                <option value="puebla">Puebla</option>
                <option value="guadalajara">Guadalajara</option>
                <option value="ixtapan">Ixtapan</option>
                <option value="taxco">Taxco</option>
              </select>
            </div>

            <div class="form-group">
              <label>Categoria *</label>
              <select id="categoria" required>
                <option value="">Selecciona...</option>
                <option value="MINIS">MINIS (10-11 Años)</option>
                <option value="INFANTIL">INFANTIL (12-14 Años)</option>
                <option value="CADETES">CADETES (15-16 Años)</option>
                <option value="JUNIOR">JUNIOR (17-18 Años)</option>
                <option value="SENIOR">SENIOR (19-29 Años)</option>
                <option value="PRINCIPIANTES">PRINCIPIANTES (Edad Libre)</option>
                <option value="MASTER 30">MASTER 30 (30-39 Años)</option>
                <option value="MASTER 40">MASTER 40 (40-49 Años)</option>
                <option value="MASTER 50">MASTER 50 (50+ Años)</option>
                <option value="FEMENIL">FEMENIL (Edad Libre)</option>
                <option value="PRO ELITE">PRO ELITE (19+ Años)</option>
                <option value="EBIKE">EBIKE (Edad Libre)</option>
                <option value="EBIKE FULL POWER">EBIKE FULL POWER (Edad Libre)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Datos del Corredor</h3>

          <div class="form-group">
            <label>Nombre Completo *</label>
            <input type="text" id="nombre" required placeholder="Ej: Juan Perez Garcia">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Email *</label>
              <input type="email" id="email" required placeholder="correo@ejemplo.com">
            </div>

            <div class="form-group">
              <label>Telefono *</label>
              <input type="tel" id="telefono" required placeholder="5512345678">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Nacimiento *</label>
              <input type="date" id="fecha_nacimiento" required>
            </div>

            <div class="form-group">
              <label>Equipo</label>
              <input type="text" id="equipo" placeholder="Nombre del equipo (opcional)">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Tipo de Sangre *</label>
              <select id="tipo_sangre" required>
                <option value="">Selecciona...</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div class="form-group">
              <label>Alergias</label>
              <input type="text" id="alergias" placeholder="Ej: Penicilina (o dejar vacio)">
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Contacto de Emergencia</h3>

          <div class="form-row">
            <div class="form-group">
              <label>Nombre del Contacto *</label>
              <input type="text" id="emergencia_nombre" required placeholder="Nombre completo">
            </div>

            <div class="form-group">
              <label>Telefono del Contacto *</label>
              <input type="tel" id="emergencia_telefono" required placeholder="5512345678">
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Tipo de Pago</h3>

          <div class="form-group">
            <label>Metodo de Pago *</label>
            <select id="tipo_pago" required>
              <option value="deposito">Precio Normal - Deposito $1500</option>
              <option value="patrocinado">Patrocinado - Sin Costo</option>
            </select>
          </div>
        </div>

        <div class="form-card">
          <h3>Playera Oficial</h3>

          <div id="jerseyContainer">
            <p class="jersey-info">Selecciona una sede para verificar disponibilidad...</p>
          </div>
        </div>

        <button type="submit" class="submit-btn" id="submitBtn">
          Inscribir Corredor
        </button>

      </form>

      <div class="result" id="result">
        <h4 id="resultTitle"></h4>
        <div id="resultContent"></div>
        <button class="new-btn" onclick="newRegistration()">+ Nueva Inscripcion</button>
      </div>

    </div>
  </div>

  <script>
    let adminPassword = '';
    let jerseyDisponible = false;

    function login() {
      const password = document.getElementById('passwordInput').value;
      if (!password) {
        alert('Ingresa la contraseña');
        return;
      }
      adminPassword = password;
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('formSection').classList.add('active');
    }

    function logout() {
      adminPassword = '';
      document.getElementById('loginSection').style.display = 'block';
      document.getElementById('formSection').classList.remove('active');
      document.getElementById('passwordInput').value = '';
    }

    async function checkJerseyAvailability() {
      const sede = document.getElementById('sede').value;
      const container = document.getElementById('jerseyContainer');

      if (!sede) {
        container.innerHTML = '<p class="jersey-info">Selecciona una sede para verificar disponibilidad...</p>';
        jerseyDisponible = false;
        return;
      }

      container.innerHTML = '<p class="jersey-info">Verificando disponibilidad...</p>';

      try {
        const response = await fetch('/api/inventory?sede=' + sede);
        const data = await response.json();

        if (data.success && !data.playeras.agotadas && data.playeras.disponibles > 0) {
          jerseyDisponible = true;
          container.innerHTML = '<div class="jersey-section"><label>Talla de Playera (' + data.playeras.disponibles + ' disponibles)</label><p class="jersey-info">Hay playeras disponibles para esta sede!</p><select id="talla_playera"><option value="">Sin playera</option><option value="S">S - Chica</option><option value="M">M - Mediana</option><option value="L">L - Grande</option><option value="XL">XL - Extra Grande</option></select></div>';
        } else {
          jerseyDisponible = false;
          container.innerHTML = '<div class="jersey-section no-disponible"><label>Playeras Agotadas</label><p class="jersey-info">Ya no hay playeras disponibles para esta sede.</p></div>';
        }
      } catch (error) {
        console.error('Error checking jersey:', error);
        jerseyDisponible = false;
        container.innerHTML = '<div class="jersey-section no-disponible"><label>Error</label><p class="jersey-info">No se pudo verificar disponibilidad.</p></div>';
      }
    }

    async function submitForm(event) {
      event.preventDefault();

      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.textContent = 'Procesando...';

      const tallaEl = document.getElementById('talla_playera');

      const corredor = {
        nombre: document.getElementById('nombre').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
        equipo: document.getElementById('equipo').value.trim() || 'Independiente',
        tipo_sangre: document.getElementById('tipo_sangre').value,
        alergias: document.getElementById('alergias').value.trim() || 'Ninguna',
        emergencia_nombre: document.getElementById('emergencia_nombre').value.trim(),
        emergencia_telefono: document.getElementById('emergencia_telefono').value.trim(),
        sede: document.getElementById('sede').value,
        categoria: document.getElementById('categoria').value,
        talla_playera: tallaEl ? tallaEl.value : '',
        tipo_pago: document.getElementById('tipo_pago').value
      };

      try {
        const response = await fetch('/api/manual-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: adminPassword,
            corredor: corredor
          })
        });

        const data = await response.json();

        const resultDiv = document.getElementById('result');
        const resultTitle = document.getElementById('resultTitle');
        const resultContent = document.getElementById('resultContent');

        if (data.success) {
          resultDiv.className = 'result success';
          resultTitle.textContent = 'Inscripcion Exitosa!';
          resultContent.innerHTML = '<p><strong>Corredor:</strong> ' + data.corredor.nombre + '</p><p><strong>Orden:</strong> <span class="code">' + data.orderNumber + '</span></p><p><strong>Codigo QR:</strong> <span class="code">' + data.checkInCode + '</span></p><p><strong>Boleto Rifa:</strong> <span class="code">#' + (data.raffleNumber || 'N/A') + '</span></p><p><strong>Email:</strong> ' + (data.email.status === 'sent' ? 'Enviado' : 'Error: ' + (data.email.error || 'No enviado')) + '</p>';
          document.getElementById('registrationForm').style.display = 'none';
        } else {
          resultDiv.className = 'result error';
          resultTitle.textContent = 'Error';
          resultContent.innerHTML = '<p>' + (data.error || 'Error desconocido') + '</p>';
        }

      } catch (error) {
        console.error('Error:', error);
        const resultDiv = document.getElementById('result');
        resultDiv.className = 'result error';
        document.getElementById('resultTitle').textContent = 'Error de conexion';
        document.getElementById('resultContent').innerHTML = '<p>' + error.message + '</p>';
      }

      btn.disabled = false;
      btn.textContent = 'Inscribir Corredor';
    }

    function newRegistration() {
      document.getElementById('registrationForm').reset();
      document.getElementById('registrationForm').style.display = 'block';
      document.getElementById('result').className = 'result';
      document.getElementById('jerseyContainer').innerHTML = '<p class="jersey-info">Selecciona una sede para verificar disponibilidad...</p>';
      jerseyDisponible = false;
    }
  </script>

</body>
</html>`;

  res.status(200).send(html);
};
