// app/api/tools/get-sports-news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { team, limit } = body;
    
    // Defaults
    limit = limit || 5;
    team = team || '';
    
    console.log('[get_sports_news] Recibido:', { team, limit });

    const domain = 'https://kirolakeitb.eus';
    
    // Normalización de equipos
    const teamMap: Record<string, string> = {
      // Sin equipo específico
      '': '',
      'general': '',
      'todas': '',
      'todos': '',
      
      // Athletic Club
      'athletic': 'athletic',
      'athletic club': 'athletic',
      'athletic bilbao': 'athletic',
      'bilbao': 'athletic',
      'leones': 'athletic',
      
      // Real Sociedad
      'real sociedad': 'real sociedad',
      'real': 'real sociedad',
      'la real': 'real sociedad',
      'donostia': 'real sociedad',
      'txuri urdin': 'real sociedad',
      
      // Alavés
      'alaves': 'alavés',
      'alavés': 'alavés',
      'deportivo alaves': 'alavés',
      'deportivo alavés': 'alavés',
      'vitoria': 'alavés',
      'glorioso': 'alavés',
      
      // Eibar
      'eibar': 'eibar',
      'sd eibar': 'eibar',
      
      // Otros deportes
      'baskonia': 'baskonia',
      'basket': 'baloncesto',
      'baloncesto': 'baloncesto',
      'ciclismo': 'ciclismo',
      'pelota': 'pelota vasca'
    };

    const normalizedTeam = teamMap[team.toLowerCase()] ?? '';
    
    console.log('[get_sports_news] Equipo normalizado:', normalizedTeam);

    // URL base de deportes
    const url = `${domain}/es/`;

    console.log('[get_sports_news] URL:', url);

    // Fetch con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' 
      },
      signal: controller.signal,
      next: { revalidate: 60 }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extraer artículos deportivos
    let elements = $('article').toArray();

    // Si se especificó un equipo, filtrar
    if (normalizedTeam) {
      elements = elements.filter(el => {
        const $el = $(el);
        const title = $el.find('h2, h3, h4').text().toLowerCase();
        const summary = $el.find('p, .sumario').text().toLowerCase();
        return title.includes(normalizedTeam) || summary.includes(normalizedTeam);
      });
    }

    // Limitar resultados
    elements = elements.slice(0, Math.min(limit, 10));

    console.log('[get_sports_news] Artículos encontrados:', elements.length);

    // Procesar noticias deportivas
    const news = await Promise.all(
      elements.map(async (el) => {
        const $el = $(el);
        const link = $el.find('a').first().attr('href');
        const fullUrl = link?.startsWith('http') ? link : `${domain}${link}`;

        let itemData = {
          title: $el.find('h2, h3, h4').text().trim(),
          url: fullUrl,
          summary: $el.find('p, .sumario, .lead').text().trim(),
          image: null as string | null,
          team: normalizedTeam || detectTeam($el.text())
        };

        // Obtener detalles
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
            
            itemData.image = $detail('meta[property="og:image"]').attr('content') || 
                            $detail('article img').first().attr('src') || 
                            null;
            
            const ogDesc = $detail('meta[property="og:description"]').attr('content');
            if (ogDesc && ogDesc.length > itemData.summary.length) {
              itemData.summary = ogDesc;
            }
          }
        } catch (e) {
          console.warn('[get_sports_news] Error obteniendo detalles de:', fullUrl);
        }

        return itemData;
      })
    );

    // Filtrar noticias válidas
    const validNews = news.filter(n => n.title !== "" && n.title.length > 10);

    console.log('[get_sports_news] Noticias válidas:', validNews.length);

    return NextResponse.json({ 
      success: true, 
      count: validNews.length,
      team: normalizedTeam || 'general',
      news: validNews
    });

  } catch (error: any) {
    console.error('[get_sports_news] Error:', error.message);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      news: []
    }, { status: 500 });
  }
}

// Helper: Detectar equipo en el texto
function detectTeam(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('athletic')) return 'Athletic Club';
  if (lowerText.includes('real sociedad') || lowerText.includes('la real')) return 'Real Sociedad';
  if (lowerText.includes('alavés') || lowerText.includes('alaves')) return 'Deportivo Alavés';
  if (lowerText.includes('eibar')) return 'SD Eibar';
  if (lowerText.includes('baskonia')) return 'Baskonia';
  
  return 'General';
}