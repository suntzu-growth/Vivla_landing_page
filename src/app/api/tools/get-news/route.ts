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

    const domain = 'https://orain.eus';
    
    // Normalización de categorías (maneja tildes y variaciones)
    const categoryMap: Record<string, string> = {
      // Sin categoría
      '': '',
      'general': '',
      'todas': '',
      'todos': '',
      'noticias': '',
      
      // Política
      'politica': 'politica',
      'política': 'politica',
      'polÃ­tica': 'politica',
      
      // Economía
      'economia': 'economia',
      'economía': 'economia',
      'economÃ­a': 'economia',
      
      // Sociedad
      'sociedad': 'sociedad',
      
      // Cultura
      'cultura': 'cultura',
      
      // Deportes
      'deportes': 'deportes',
      'deporte': 'deportes'
    };

    // Normalizar la categoría
    const normalizedCategory = categoryMap[category.toLowerCase()] ?? '';
    
    console.log('[get_news] Categoría normalizada:', normalizedCategory);

    // Construir URL
    const url = normalizedCategory 
      ? `${domain}/es/${normalizedCategory}` 
      : `${domain}/es/`;

    console.log('[get_news] URL:', url);

    // Fetch con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' 
      },
      signal: controller.signal,
      next: { revalidate: 60 } // Cache 1 minuto
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extraer artículos (limitado)
    const elements = $('article').toArray().slice(0, Math.min(limit, 10));

    console.log('[get_news] Artículos encontrados:', elements.length);

    // Procesar noticias en paralelo
    const news = await Promise.all(
      elements.map(async (el) => {
        const $el = $(el);
        const link = $el.find('a').first().attr('href');
        const fullUrl = link?.startsWith('http') ? link : `${domain}${link}`;

        let itemData = {
          title: $el.find('h2, h3, h4').text().trim(),
          url: fullUrl,
          summary: $el.find('p, .sumario, .lead').text().trim(),
          image: null as string | null
        };

        // Intentar obtener detalles de la noticia
        try {
          const detailController = new AbortController();
          const detailTimeoutId = setTimeout(() => detailController.abort(), 5000);

          const detailRes = await fetch(fullUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: detailController.signal
          });

          clearTimeout(detailTimeoutId);

          if (detailRes.ok) {
            const detailHtml = await detailRes.text();
            const $detail = cheerio.load(detailHtml);
            
            // Extraer imagen y descripción mejorada
            itemData.image = $detail('meta[property="og:image"]').attr('content') || 
                            $detail('article img').first().attr('src') || 
                            null;
            
            const ogDesc = $detail('meta[property="og:description"]').attr('content');
            if (ogDesc && ogDesc.length > itemData.summary.length) {
              itemData.summary = ogDesc;
            }
          }
        } catch (e) {
          console.warn('[get_news] Error obteniendo detalles de:', fullUrl);
        }

        return itemData;
      })
    );

    // Filtrar noticias vacías
    const validNews = news.filter(n => n.title !== "" && n.title.length > 10);

    console.log('[get_news] Noticias válidas:', validNews.length);

    return NextResponse.json({ 
      success: true, 
      count: validNews.length,
      category: normalizedCategory || 'general',
      news: validNews
    });

  } catch (error: any) {
    console.error('[get_news] Error:', error.message);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      news: [] // Retornar array vacío en caso de error
    }, { status: 500 });
  }
}