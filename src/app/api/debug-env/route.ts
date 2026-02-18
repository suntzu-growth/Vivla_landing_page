import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? '✓ SET' : '✗ MISSING',
    ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID ? '✓ SET' : '✗ MISSING',
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ? '✓ SET' : '✗ MISSING',
    WHATSAPP_TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME ? '✓ SET' : '✗ MISSING',
    WHATSAPP_TEMPLATE_LANGUAGE: process.env.WHATSAPP_TEMPLATE_LANGUAGE ? '✓ SET' : '✗ MISSING',
  });
}
