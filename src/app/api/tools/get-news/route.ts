// app/api/tools/get-news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { category, limit } = body;

    // Defaults
    limit = limit || 5;
    category = category || '';

    console.log('[get_news] Recibido:', { category, limit });

    // NOTA: Se ha eliminado el scraping de orain.eus.
    // Ahora devuelve noticias/listados internos de Vivla.

    const dataPath = './data/scraping/noticias-completas.json';
    let validNews = [];

    try {
      if (require('fs').existsSync(dataPath)) {
        const fullData = JSON.parse(require('fs').readFileSync(dataPath, 'utf8'));
        validNews = fullData.articles.map((a: any) => ({
          title: a.title,
          url: a.url,
          summary: a.summary,
          image: a.image
        })).slice(0, limit);
      }
    } catch (e) {
      console.error('[get_news] Error leyendo datos locales:', e);
    }

    console.log('[get_news] Noticias de Vivla cargadas:', validNews.length);

    return NextResponse.json({
      success: true,
      count: validNews.length,
      category: category || 'vivla',
      source: 'Internal Vivla Data',
      news: validNews
    });

  } catch (error: any) {
    console.error('[get_news] Error:', error.message);

    return NextResponse.json({
      success: false,
      error: error.message,
      news: []
    }, { status: 500 });
  }
}