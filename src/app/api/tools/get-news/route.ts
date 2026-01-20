import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
    try {
        const { category, limit = 5 } = await request.json();
        const domain = 'https://orain.eus';
        const baseUrl = 'https://orain.eus/es';
        
        // Mapeo de categorías para la URL
        const categoryMap: Record<string, string> = {
            'politica': 'politica',
            'economia': 'economia',
            'sociedad': 'sociedad',
            'cultura': 'cultura',
            'deportes': 'deportes'
        };
        
        const path = categoryMap[category?.toLowerCase()] || '';
        const url = path ? `${baseUrl}/${path}` : baseUrl;

        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        });

        const html = await response.text();
        const $ = cheerio.load(html);
        const elements = $('article, .noticia, .news-item').toArray().slice(0, limit);

        const news = await Promise.all(elements.map(async (el, index) => {
            const $el = $(el);
            const rawLink = $el.find('a').first().attr('href');
            let cleanUrl = rawLink?.startsWith('http') ? rawLink : `${domain}${rawLink?.startsWith('/') ? '' : '/es/'}${rawLink}`;

            // Datos por defecto de la lista
            let data = {
                id: `news-${index}`,
                title: $el.find('h2, h3').first().text().trim() || 'Noticia Orain.eus',
                summary: $el.find('p, .sumario').first().text().trim(),
                image: null as string | null,
                url: cleanUrl,
                source: 'Orain.eus'
            };

            // Extracción de Metadatos OG (La "Previa" visual)
            if (cleanUrl && cleanUrl.includes('orain.eus')) {
                try {
                    const detailRes = await fetch(cleanUrl, { signal: AbortSignal.timeout(2500) });
                    const detailHtml = await detailRes.text();
                    const $meta = cheerio.load(detailHtml);
                    
                    data.title = $meta('meta[property="og:title"]').attr('content') || data.title;
                    data.summary = $meta('meta[property="og:description"]').attr('content') || 
                                   $meta('meta[name="description"]').attr('content') || data.summary;
                    data.image = $meta('meta[property="og:image"]').attr('content') || null;
                } catch (e) {
                    console.warn(`[API] Error metadatos: ${cleanUrl}`);
                }
            }

            return data;
        }));

        return NextResponse.json({ success: true, news: news.filter(n => n.title) });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ limit: 5 }) }));
}