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
    
    // CAMBIO PRINCIPAL: Ahora usa /actualidad/ como base
    const baseUrl = `${domain}/es/actualidad/`;
    
    // Normalización de categorías
    const categoryMap: Record<string, string> = {
      // Sin categoría - ACTUALIDAD GENERAL
      '': '',
      'general': '',
      'todas': '',
      'todos': '',
      'noticias': '',
      'actualidad': '',
      
      // Política
      'politica': 'politica',
      'política': 'politica',
      'politÃ­tica': 'politica',
      
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
      ? `${baseUrl}${normalizedCategory}` 
      : baseUrl;

    console.log('[get_news] URL:', url);

    // Fetch con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9'
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
    
    // Selectores específicos para /actualidad/
    // Probamos diferentes selectores comunes en Orain
    const selectors = [
      'article.noticia',           // Selector específico de noticias
      'article',                   // Artículos genéricos
      '.noticia-item',            // Items de noticias
      '.news-item',               // Items alternativos
      'div[class*="noticia"]',    // Divs con "noticia" en la clase
      'div[class*="news"]'        // Divs con "news" en la clase
    ];

    let elements: any[] = [];
    
    // Intentar con cada selector hasta encontrar contenido
    for (const selector of selectors) {
      elements = $(selector).toArray();
      if (elements.length > 0) {
        console.log(`[get_news] Usando selector: ${selector} (${elements.length} elementos)`);
        break;
      }
    }

    // Limitar resultados
    elements = elements.slice(0, Math.min(limit, 10));

    console.log('[get_news] Artículos encontrados:', elements.length);

    if (elements.length === 0) {
      console.warn('[get_news] No se encontraron noticias con selectores estándar');
      // Fallback: intentar extraer cualquier enlace con título
      elements = $('a[href*="/es/"]').filter((_, el) => {
        const text = $(el).text().trim();
        return text.length > 20; // Solo enlaces con texto sustancial
      }).toArray().slice(0, limit);
      
      console.log('[get_news] Fallback encontró:', elements.length, 'elementos');
    }

    // Procesar noticias en paralelo
    const news = await Promise.all(
      elements.map(async (el) => {
        const $el = $(el);
        
        // Extraer link
        let link = $el.is('a') ? $el.attr('href') : $el.find('a').first().attr('href');
        const fullUrl = link?.startsWith('http') ? link : `${domain}${link}`;

        // Extraer título con múltiples selectores
        let title = $el.find('h2, h3, h4, .titulo, .title').first().text().trim();
        if (!title) {
          title = $el.is('a') ? $el.text().trim() : $el.find('a').first().text().trim();
        }

        let itemData = {
          title: title,
          url: fullUrl,
          summary: $el.find('p, .sumario, .lead, .descripcion').first().text().trim(),
          image: null as string | null
        };

        // Intentar obtener detalles de la noticia
        try {
          const detailController = new AbortController();
          const detailTimeoutId = setTimeout(() => detailController.abort(), 5000);

          const detailRes = await fetch(fullUrl, { 
            headers: { 
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'text/html,application/xhtml+xml'
            },
            signal: detailController.signal
          });

          clearTimeout(detailTimeoutId);

          if (detailRes.ok) {
            const detailHtml = await detailRes.text();
            const $detail = cheerio.load(detailHtml);
            
            // Extraer imagen con múltiples fuentes
            itemData.image = 
              $detail('meta[property="og:image"]').attr('content') || 
              $detail('meta[name="twitter:image"]').attr('content') ||
              $detail('article img').first().attr('src') || 
              $detail('.noticia img, .news img').first().attr('src') ||
              null;
            
            // Asegurar URL completa de imagen
            if (itemData.image && !itemData.image.startsWith('http')) {
              itemData.image = `${domain}${itemData.image}`;
            }
            
            // Extraer descripción mejorada
            const ogDesc = $detail('meta[property="og:description"]').attr('content');
            const twitterDesc = $detail('meta[name="twitter:description"]').attr('content');
            const bestDesc = ogDesc || twitterDesc;
            
            if (bestDesc && bestDesc.length > itemData.summary.length) {
              itemData.summary = bestDesc;
            }
          }
        } catch (e) {
          console.warn('[get_news] Error obteniendo detalles de:', fullUrl);
        }

        return itemData;
      })
    );

    // Filtrar noticias vacías o con títulos muy cortos
    const validNews = news.filter(n => 
      n.title !== "" && 
      n.title.length > 10 &&
      n.url.includes('/es/')
    );

    console.log('[get_news] Noticias válidas:', validNews.length);

    return NextResponse.json({ 
      success: true, 
      count: validNews.length,
      category: normalizedCategory || 'actualidad',
      source: url,
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