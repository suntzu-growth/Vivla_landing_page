import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, email, telefono, vivienda, destino, presupuesto, urgencia, notas } = body;

    // Validar campos obligatorios
    if (!nombre || !email || !telefono) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: nombre, email, telefono'
      }, { status: 400 });
    }

    // Variables de entorno
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
    const aePhone = process.env.WHATSAPP_AE_PHONE;

    if (!apiKey || !phoneNumberId || !templateName || !aePhone) {
      console.error('[notify-whatsapp] Missing environment variables');
      return NextResponse.json({
        success: false,
        error: 'WhatsApp configuration incomplete'
      }, { status: 500 });
    }

    console.log('\n' + '='.repeat(50));
    console.log('[notify-whatsapp] ENVIANDO NOTIFICACION');
    console.log('------------------------------------------');
    console.log(`Lead: ${nombre} | ${email} | ${telefono}`);
    console.log(`Vivienda: ${vivienda || 'N/A'} | Destino: ${destino || 'N/A'}`);
    console.log(`AE Phone: ${aePhone}`);
    console.log('='.repeat(50) + '\n');

    // Construir parámetros de la plantilla en el orden esperado
    const templateParameters = [
      { type: "text", text: nombre || '' },
      { type: "text", text: email || '' },
      { type: "text", text: telefono || '' },
      { type: "text", text: vivienda || 'No especificada' },
      { type: "text", text: destino || 'No especificado' },
      { type: "text", text: presupuesto || 'No especificado' },
      { type: "text", text: urgencia || 'No especificada' },
      { type: "text", text: notas || 'Sin notas adicionales' }
    ];

    // Llamar a ElevenLabs WhatsApp API
    const response = await fetch('https://api.elevenlabs.io/v1/whatsapp/outbound-message', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_number_id: phoneNumberId,
        to: aePhone,
        template_name: templateName,
        template_language: templateLanguage,
        components: [
          {
            type: "body",
            parameters: templateParameters
          }
        ]
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('[notify-whatsapp] WhatsApp enviado correctamente:', result);
      return NextResponse.json({
        success: true,
        message: 'WhatsApp notification sent',
        data: result
      });
    } else {
      console.error('[notify-whatsapp] Error de API:', result);
      return NextResponse.json({
        success: false,
        error: 'WhatsApp API error',
        details: result
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('[notify-whatsapp] Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
