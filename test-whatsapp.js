/**
 * Script de prueba para la notificación de WhatsApp
 * Ejecutar con: node test-whatsapp.js
 */

const testWhatsAppNotification = async () => {
  console.log('\n🧪 PROBANDO NOTIFICACIÓN DE WHATSAPP...\n');

  // Datos de prueba (ajusta tu número de teléfono aquí)
  const testData = {
    nombre: 'Matías Test',
    telefono: '+34612247179', // Probando con + incluido
    url_vivienda: 'https://www.vivla.com/es/listings/casa-neret',
    horario: 'Tardes entre 16:00-17:00h'
  };

  console.log('📋 Datos de prueba:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n⏳ Enviando petición al endpoint...\n');

  try {
    const response = await fetch('http://localhost:3000/api/notify-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log('📥 RESPUESTA DEL SERVIDOR:');
    console.log('------------------------------------------');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('\nBody:');
    console.log(JSON.stringify(result, null, 2));
    console.log('------------------------------------------\n');

    if (response.ok) {
      console.log('✅ ¡ÉXITO! WhatsApp enviado correctamente');
    } else {
      console.log('❌ ERROR al enviar WhatsApp');
      console.log('\n💡 Posibles causas:');
      console.log('   1. La plantilla de WhatsApp no existe o no está aprobada');
      console.log('   2. El WHATSAPP_TEMPLATE_NAME es incorrecto');
      console.log('   3. El número de teléfono no tiene formato correcto');
      console.log('   4. Faltan variables de entorno en .env.local');
    }

  } catch (error) {
    console.error('❌ ERROR DE CONEXIÓN:', error.message);
    console.log('\n💡 Asegúrate de que el servidor Next.js esté corriendo:');
    console.log('   npm run dev');
  }

  console.log('\n');
};

// Ejecutar la prueba
testWhatsAppNotification();
