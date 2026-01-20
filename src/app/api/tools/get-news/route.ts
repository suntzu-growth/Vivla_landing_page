import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { category } = await request.json();
    const domain = 'https://orain.eus';
    
    // Diccionario de categorías para evitar errores de tildes o términos
    const categoryMap: { [key: string]: string } = {
      'noticias': '',
      'economia': 'economia',
      'economía': 'economia',
      'política': 'politica',
      'politica': 'politica',
      'deportes': 'deportes',
      'cultura': 'cultura',
      'sociedad': 'sociedad'
    };

    const targetCategory = categoryMap[category?.toLowerCase()] || '';
    const url = targetCategory ? `${domain}/es/${targetCategory}` : `${domain}/es/`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
      next: { revalidate: 60 } // Cache de 1 minuto
    });

    if (!response.ok) throw new Error("Error en la conexión con la fuente");

    const html = await response.text();
    const $ = cheerio.load(html);
    const elements = $('article').toArray().slice(0, 5);

    const news = await Promise.all(elements.map(async (el) => {
      const $el = $(el);
      const link = $el.find('a').first().attr('href');
      const fullUrl = link?.startsWith('http') ? link : `${domain}${link}`;

      return {
        title: $el.find('h2, h3').text().trim(),
        url: fullUrl,
        summary: $el.find('p, .sumario').text().trim(),
        // La imagen se extrae en el ResultsStream o aquí mismo con un fetch adicional
        image: null 
      };
    }));

    return NextResponse.json({ 
      success: true, 
      news: news.filter(n => n.title !== "") 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}