import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, email, url_vivienda, horario } = body;

    if (!nombre || !email || !url_vivienda || !horario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: nombre, email, url_vivienda, horario'
        },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@vivla.com';

    if (!resendApiKey) {
      console.error('[notify-email] Missing RESEND_API_KEY');
      return NextResponse.json(
        { success: false, error: 'Email configuration incomplete' },
        { status: 500 }
      );
    }

    console.log('\n' + '='.repeat(50));
    console.log('[notify-email] ENVIANDO EMAIL DE CONFIRMACIÓN');
    console.log('------------------------------------------');
    console.log(`Destinatario: ${nombre} | ${email}`);
    console.log(`Vivienda: ${url_vivienda}`);
    console.log(`Horario preferido: ${horario}`);
    console.log('='.repeat(50) + '\n');

    // Construir HTML del email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .info-box {
      background: white;
      padding: 15px;
      border-left: 4px solid #667eea;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>¡Gracias por tu interés!</h1>
  </div>
  <div class="content">
    <p>Hola <strong>${nombre}</strong>,</p>

    <p>Hemos recibido tu solicitud de información sobre la propiedad que te interesa.</p>

    <div class="info-box">
      <p><strong>📅 Tu horario preferido de contacto:</strong><br>${horario}</p>
    </div>

    <p>Nuestro equipo se pondrá en contacto contigo en el horario que indicaste para brindarte toda la información que necesites.</p>

    <center>
      <a href="${url_vivienda}" class="button">Ver Detalles de la Propiedad</a>
    </center>

    <p>Mientras tanto, puedes revisar los detalles completos de la propiedad haciendo clic en el botón de arriba.</p>

    <p>Si tienes alguna pregunta urgente, no dudes en responder a este correo.</p>

    <p>¡Estamos aquí para ayudarte a encontrar tu hogar ideal!</p>

    <p>Saludos cordiales,<br><strong>Equipo SunTzu</strong></p>
  </div>
  <div class="footer">
    <p>Este es un correo automático. Por favor no respondas a este mensaje.</p>
  </div>
</body>
</html>
    `.trim();

    // Enviar email con Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailFrom,
        to: email,
        subject: '¡Gracias por tu interés en SunTzu! 🏡',
        html: emailHtml
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[notify-email] ✅ Email enviado correctamente:', result.id);
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        emailId: result.id
      });
    } else {
      const errorData = await response.json();
      console.error('[notify-email] ❌ Error enviando email:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: errorData
        },
        { status: response.status }
      );
    }

  } catch (error: any) {
    console.error('[notify-email] Error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
