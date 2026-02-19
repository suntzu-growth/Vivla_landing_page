import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nombre, email, telefono,
      destino_preferido, vivienda_elegida, presupuesto,
      financiacion, urgencia, preocupaciones,
      // Parámetros opcionales para el ticket (pueden venir del agente o se generan automáticamente)
      ticket_subject,
      ticket_content,
      ticket_priority,
    } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: email'
      }, { status: 400 });
    }

    const hubspotToken = process.env.HUBSPOT_API_TOKEN;

    // Owner IDs configurados
    const OWNER_DEPORTES = process.env.HUBSPOT_OWNER_DEPORTES || '30953137'; // Daniel Hernández
    const OWNER_PLAYA = process.env.HUBSPOT_OWNER_PLAYA || '30586602'; // Matías Alucema
    const OWNER_MONTANA = process.env.HUBSPOT_OWNER_MONTANA || '29470097'; // Oscar Cordero
    const OWNER_DEFAULT = process.env.HUBSPOT_OWNER_DEFAULT || '32165115'; // Suntzu Tech

    if (!hubspotToken) {
      console.error('[assign-hubspot] Missing HUBSPOT_API_TOKEN');
      return NextResponse.json({
        success: false,
        error: 'HubSpot configuration incomplete'
      }, { status: 500 });
    }

    // ========================================
    // ASIGNACIÓN INTELIGENTE DE PROPIETARIO
    // ========================================
    const assignSmartOwner = (destino: string = '', vivienda: string = '', preocupaciones: string = ''): string => {
      const textoCombinado = `${destino} ${vivienda} ${preocupaciones}`.toLowerCase();

      // 1. DEPORTES (Daniel Hernández)
      const deportesKeywords = ['golf', 'tenis', 'paddle', 'padel', 'gimnasio', 'deporte', 'deportivo', 'deportes', 'activo', 'fitness'];
      if (deportesKeywords.some(keyword => textoCombinado.includes(keyword))) {
        console.log(`[assign-hubspot] Match DEPORTES → Daniel Hernández (${OWNER_DEPORTES})`);
        return OWNER_DEPORTES;
      }

      // 2. PLAYA/COSTA (Matías Alucema)
      const playaKeywords = ['playa', 'costa', 'mar', 'mediterráneo', 'mediterraneo', 'vistas al mar', 'primera línea', 'primera linea', 'paseo marítimo', 'paseo maritimo'];
      if (playaKeywords.some(keyword => textoCombinado.includes(keyword))) {
        console.log(`[assign-hubspot] Match PLAYA → Matías Alucema (${OWNER_PLAYA})`);
        return OWNER_PLAYA;
      }

      // 3. MONTAÑA/NATURALEZA (Oscar Cordero)
      const montanaKeywords = ['montaña', 'montana', 'sierra', 'naturaleza', 'tranquilidad', 'rural', 'campo', 'senderismo', 'esquí', 'esqui', 'ski', 'nieve'];
      if (montanaKeywords.some(keyword => textoCombinado.includes(keyword))) {
        console.log(`[assign-hubspot] Match MONTAÑA → Oscar Cordero (${OWNER_MONTANA})`);
        return OWNER_MONTANA;
      }

      // 4. DEFAULT (Suntzu Tech) - Lujo, Relax, Familiar, Social
      console.log(`[assign-hubspot] Sin match específico → Suntzu Tech (DEFAULT: ${OWNER_DEFAULT})`);
      return OWNER_DEFAULT;
    };

    const ownerId = assignSmartOwner(destino_preferido, vivienda_elegida, preocupaciones);

    const nameParts = (nombre || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Identificar nombre del owner asignado
    const ownerNames: Record<string, string> = {
      [OWNER_DEPORTES]: 'Daniel Hernández (Deportes)',
      [OWNER_PLAYA]: 'Matías Alucema (Playa/Costa)',
      [OWNER_MONTANA]: 'Oscar Cordero (Montaña/Naturaleza)',
      [OWNER_DEFAULT]: 'Suntzu Tech (Default/Lujo/Relax)'
    };
    const ownerName = ownerNames[ownerId] || `Unknown (${ownerId})`;

    console.log('\n' + '='.repeat(50));
    console.log('[assign-hubspot] CREANDO/ASIGNANDO LEAD EN HUBSPOT');
    console.log('------------------------------------------');
    console.log(`Lead: ${nombre || 'N/A'} | Email: ${email} | Tel: ${telefono || 'N/A'}`);
    console.log(`Destino: ${destino_preferido || 'N/A'} | Vivienda: ${vivienda_elegida || 'N/A'}`);
    console.log(`Owner asignado: ${ownerName}`);
    console.log('='.repeat(50) + '\n');

    // Propiedades de calificación
    const qualificationProps: Record<string, string> = {};
    if (destino_preferido) qualificationProps.destino_preferido = destino_preferido;
    if (vivienda_elegida) qualificationProps.vivienda_elegida = vivienda_elegida;
    if (presupuesto) qualificationProps.presupuesto = presupuesto;
    if (financiacion) qualificationProps.financiacion = financiacion;
    if (urgencia) qualificationProps.urgencia = urgencia;
    if (preocupaciones) qualificationProps.preocupaciones = preocupaciones;

    // ========================================
    // PASO 1: BUSCAR O CREAR CONTACTO
    // ========================================
    const searchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }]
      })
    });

    const searchResult = await searchResponse.json();

    let contactId: string;

    if (searchResult.total > 0) {
      contactId = searchResult.results[0].id;
      console.log(`[assign-hubspot] Contacto encontrado: ${contactId}`);
    } else {
      console.log('[assign-hubspot] Contacto no encontrado, creando nuevo...');

      const createResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            email,
            firstname: firstName,
            lastname: lastName,
            phone: telefono || '',
            ...qualificationProps
          }
        })
      });

      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        console.error('[assign-hubspot] Error creando contacto:', createResult);
        return NextResponse.json({
          success: false,
          error: 'Failed to create HubSpot contact',
          details: createResult
        }, { status: createResponse.status });
      }

      contactId = createResult.id;
      console.log(`[assign-hubspot] Contacto creado: ${contactId}`);
    }

    // ========================================
    // PASO 2: ASIGNAR OWNER Y ACTUALIZAR CALIFICACIÓN
    // ========================================
    const updateResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          hubspot_owner_id: ownerId,
          firstname: firstName || undefined,
          lastname: lastName || undefined,
          phone: telefono || undefined,
          ...qualificationProps
        }
      })
    });

    const updateResult = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error('[assign-hubspot] Error actualizando contacto:', updateResult);
      return NextResponse.json({
        success: false,
        error: 'Failed to update contact',
        details: updateResult
      }, { status: updateResponse.status });
    }

    console.log(`[assign-hubspot] Contacto actualizado y asignado: ${contactId}`);

    // ========================================
    // PASO 3: CREAR TICKET (una sola vez, aquí)
    // ========================================
    // Generar contenido del ticket automáticamente si no se pasa explícitamente
    const autoSubject = ticket_subject || `Nuevo Lead Calificado${vivienda_elegida ? ` - ${vivienda_elegida}` : ''}`;
    const autoContent = ticket_content || [
      `Lead calificado interesado${vivienda_elegida ? ` en ${vivienda_elegida}` : ''}.`,
      '',
      'Detalles:',
      destino_preferido ? `Destino: ${destino_preferido}` : '',
      vivienda_elegida ? `Vivienda elegida: ${vivienda_elegida}` : '',
      presupuesto ? `Presupuesto: ${presupuesto}` : '',
      financiacion !== undefined ? `Financiación: ${financiacion || 'No necesita'}` : '',
      urgencia ? `Urgencia: ${urgencia}` : '',
      preocupaciones ? `\nPerfil del cliente:\n${preocupaciones}` : '',
    ].filter(Boolean).join('\n');

    let ticketId: string | null = null;

    const createTicketResponse = await fetch('https://api.hubapi.com/crm/v3/objects/tickets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          subject: autoSubject,
          content: autoContent,
          hs_pipeline: '0',
          hs_ticket_priority: ticket_priority || 'HIGH',
          hs_pipeline_stage: '1'
        }
      })
    });

    if (createTicketResponse.ok) {
      const ticketResult = await createTicketResponse.json();
      ticketId = ticketResult.id;
      console.log(`[assign-hubspot] Ticket creado: ${ticketId}`);

      // Asociar ticket al contacto
      const associateResponse = await fetch('https://api.hubapi.com/crm/v4/associations/tickets/contacts/batch/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: [{
            from: { id: ticketId },
            to: { id: contactId },
            type: 'ticket_to_contact'
          }]
        })
      });

      if (!associateResponse.ok) {
        const assocError = await associateResponse.json();
        console.warn('[assign-hubspot] Ticket creado pero fallo al asociar al contacto:', assocError);
      } else {
        console.log(`[assign-hubspot] Ticket ${ticketId} asociado al contacto ${contactId}`);
      }
    } else {
      const ticketError = await createTicketResponse.json();
      console.warn('[assign-hubspot] No se pudo crear el ticket (no es crítico):', ticketError);
    }

    console.log('\n' + '='.repeat(50));
    console.log('[assign-hubspot] PROCESO COMPLETADO EXITOSAMENTE');
    console.log(`Contacto ID: ${contactId}${ticketId ? ` | Ticket ID: ${ticketId}` : ''}`);
    console.log('='.repeat(50) + '\n');

    return NextResponse.json({
      success: true,
      message: 'Lead creado/actualizado y asignado en HubSpot',
      contactId,
      ticketId
    });

  } catch (error: any) {
    console.error('[assign-hubspot] Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}