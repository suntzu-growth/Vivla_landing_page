import { NextRequest, NextResponse } from 'next/server';
import { scrapeEverything } from '../../../../../scraper-completo';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
    try {
        // Verificar API Key o Token si es necesario para seguridad
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // return new NextResponse('Unauthorized', { status: 401 });
        }

        console.log('[daily-scraping] Iniciando scraping programado...');
        const result = await scrapeEverything();

        // Guardar resultados en el sistema de archivos (si el entorno lo permite)
        try {
            const dataDir = path.join(process.cwd(), 'data', 'scraping');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(
                path.join(dataDir, 'noticias-completas.json'),
                JSON.stringify(result, null, 2)
            );
        } catch (e: any) {
            console.warn('[daily-scraping] No se pudo guardar en disco:', e?.message ?? String(e));
        }

        return NextResponse.json({
            success: true,
            message: 'Scraping completado con éxito',
            totalArticles: result.totalArticles,
            timestamp: result.timestamp
        });

    } catch (error: any) {
        console.error('[daily-scraping] Error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
