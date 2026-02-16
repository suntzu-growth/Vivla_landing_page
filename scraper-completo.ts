import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface Article {
    id: string;
    source: 'suntzu';
    title: string;
    url: string;
    category: string;
    summary: string;
    content?: string;
    image?: string;
    images?: string[];
    publishDate?: string;
    scrapedAt: string;
}

interface ScrapingResult {
    timestamp: string;
    totalArticles: number;
    sources: {
        suntzu: number;
    };
    articles: Article[];
}

export async function scrapeEverything(): Promise<ScrapingResult> {
    const timestamp = new Date().toISOString();
    let allArticles: Article[] = [];

    // SunTzu scraper logic
    console.log('\n========== SCRAPING VIVLA.COM (FUENTE DE DATOS) ==========');
    try {
        const res = await fetch('https://www.vivla.com/es/listings', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            const listingLinks = $('a').filter((_, el) => $(el).text().trim().toLowerCase() === 'ver casa').get();
            console.log(`[SunTzu] Encontrados ${listingLinks.length} listados. Iniciando extracción...`);

            const suntzuArticles: Article[] = [];
            for (const linkEl of listingLinks) {
                const $link = $(linkEl);
                const href = $link.attr('href');
                if (!href) continue;
                const fullUrl = href.startsWith('http') ? href : `https://www.vivla.com${href}`;

                const $container = $link.closest('.ci-homes');
                const title = $container.find('h2').first().text().trim() || 'Casa SunTzu';
                let price = $container.find('h6').first().text().trim();

                // Multiplicar precio por 8 si existe
                if (price) {
                    const priceMatch = price.match(/[\d,.]+/);
                    if (priceMatch) {
                        const numericPrice = parseFloat(priceMatch[0].replace(/,/g, ''));
                        const multipliedPrice = numericPrice * 8;
                        price = price.replace(priceMatch[0], multipliedPrice.toLocaleString('es-ES'));
                    }
                }

                const specs = $container.find('h4, h5').map((_, el) => $(el).text().trim()).get();
                const summary = specs.join(' | ') + (price ? ` | Precio: ${price}` : '');

                // Extraer hasta 3 imágenes de la galería del card
                const images = $container.find('.collection-list-wrapper.w-dyn-list .w-dyn-repeater-item')
                    .map((_, el) => {
                        const style = $(el).attr('style') || '';
                        // Intentar capturar la URL entre url("...") o url(&quot;...&quot;) o url(...)
                        const match = style.match(/url\(["']?([^"')]*)["']?\)/i);
                        return match ? match[1].replace(/&quot;/g, '') : null;
                    })
                    .get()
                    .filter(url => url !== null)
                    .slice(0, 3);

                const art: Article = {
                    id: Buffer.from(fullUrl).toString('base64').substring(0, 10),
                    source: 'suntzu' as const,
                    title,
                    url: fullUrl,
                    category: 'inmobiliaria',
                    summary,
                    images: images,
                    image: images[0] || undefined,
                    scrapedAt: timestamp
                };

                process.stdout.write(`  Extrayendo detalle de SunTzu: ${title.substring(0, 30)}...\r`);

                try {
                    const detRes = await fetch(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (detRes.ok) {
                        const detHtml = await detRes.text();
                        const $d = cheerio.load(detHtml);
                        let content = $d('p')
                            .map((_, p) => $d(p).text().trim())
                            .get()
                            .filter(t => t.length > 50)
                            .slice(0, 10)
                            .join('\n\n');

                        art.content = content || summary;
                        if (!art.image) {
                            art.image = $d('meta[property="og:image"]').attr('content');
                        }
                    }
                    await new Promise(r => setTimeout(r, 100));
                } catch (e) { }
                suntzuArticles.push(art);
            }
            console.log('\n✅ SunTzu completado.');
            allArticles = [...allArticles, ...suntzuArticles];
        }
    } catch (e) { }

    return {
        timestamp,
        totalArticles: allArticles.length,
        sources: {
            suntzu: allArticles.length
        },
        articles: allArticles
    };
}
