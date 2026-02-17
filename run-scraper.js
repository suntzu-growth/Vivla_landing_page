const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Función para limpiar texto repetitivo
function cleanDescription(text) {
    if (!text) return text;

    // Eliminar el texto repetitivo específico
    const repetitiveText = [
        'Descarga nuestra evaluación financiera para descubrir todas las razones de peso por las que invertir en esta vivienda es una buena elección.',
        'Regístrese para descargar nuestra evaluación financiera y descubrir todas las razones de peso por las que invertir en esta vivienda es una buena elección.',
        'Descarga nuestra evaluación financiera',
        'Regístrese para descargar nuestra evaluación financiera'
    ];

    let cleanedText = text;
    repetitiveText.forEach(phrase => {
        cleanedText = cleanedText.replace(new RegExp(phrase, 'gi'), '');
    });

    // Limpiar espacios múltiples y líneas vacías
    cleanedText = cleanedText
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Reducir líneas vacías múltiples
        .trim();

    return cleanedText;
}

async function runScraper() {
    console.log('🚀 INICIANDO SCRAPING PROFUNDO REFINADO (FULL EXTRACTION)');

    const timestamp = new Date().toISOString();
    const dataDir = path.join(__dirname, 'data', 'scraping');

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    let allArticles = [];

    // --- VIVLA.COM (FUENTE DE DATOS) ---
    console.log('\n========== SCRAPING VIVLA.COM (FUENTE DE DATOS) ==========');
    try {
        const suntzuUrl = 'https://www.vivla.com/es/listings';
        const response = await fetch(suntzuUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        if (response.ok) {
            const html = await response.text();
            const $ = cheerio.load(html);

            const listingLinks = $('a').filter((_, el) => $(el).text().trim().toLowerCase() === 'ver casa').get();
            console.log(`[SunTzu] Encontrados ${listingLinks.length} listados. Iniciando extracción...`);

            const suntzuArticles = [];
            for (let i = 0; i < listingLinks.length; i++) {
                const $link = $(listingLinks[i]);
                const href = $link.attr('href');
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

                const art = {
                    id: Buffer.from(fullUrl).toString('base64').substring(0, 10),
                    source: 'suntzu',
                    title,
                    url: fullUrl,
                    category: 'inmobiliaria',
                    summary,
                    images: images,
                    image: images[0] || null, // Primer imagen para compatibilidad
                    scrapedAt: timestamp
                };

                process.stdout.write(`  [${i + 1}/${listingLinks.length}] Extrayendo detalle: ${title.substring(0, 30)}...\r`);

                try {
                    const detailRes = await fetch(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (detailRes.ok) {
                        const detailHtml = await detailRes.text();
                        const $d = cheerio.load(detailHtml);

                        // EXTRACCIÓN ESPECÍFICA: Buscar el div de descripción principal
                        let content = '';
                        const descriptionDiv = $d('.home-description-paragraph.w-richtext');

                        if (descriptionDiv.length > 0) {
                            // Extraer TODO el texto del div de descripción
                            content = descriptionDiv.text().trim();
                        } else {
                            // Fallback: extraer párrafos si no encuentra el div específico
                            content = $d('p')
                                .map((_, p) => $d(p).text().trim())
                                .get()
                                .filter(t => t.length > 30)
                                .join('\n\n');
                        }

                        // Textos a ELIMINAR completamente
                        const textsToRemove = [
                            /Eres copropietario y accionista.*/gi,
                            /Puedes comprar y vender fracciones.*/gi,
                            /En el momento de la firma.*/gi,
                            /Disfruta de la propiedad mientras.*/gi,
                            /SunTzu Studio diseña cada casa para reflejar.*/gi,
                            /con una atención al detalle que convierte.*/gi,
                            /Descarga nuestra evaluación.*/gi,
                            /Regístrese para descargar.*/gi
                        ];

                        // Filtrar textos prohibidos
                        textsToRemove.forEach(regex => {
                            content = content.replace(regex, '');
                        });

                        // Limpiar texto repetitivo adicional
                        content = cleanDescription(content);

                        art.content = content || summary;
                        art.image = $d('meta[property="og:image"]').attr('content');
                        if (!art.image) art.image = $container.find('img').first().attr('src');
                    }
                    await new Promise(r => setTimeout(r, 100));
                } catch (e) { }
                suntzuArticles.push(art);
            }
            console.log('\n✅ SunTzu completado.');
            allArticles = [...allArticles, ...suntzuArticles];
        }
    } catch (e) {
        console.error(`Error en SunTzu: ${e.message}`);
    }

    const result = {
        timestamp,
        totalArticles: allArticles.length,
        sources: {
            suntzu: allArticles.length
        },
        articles: allArticles
    };

    const dataDirFinal = path.join(__dirname, 'data', 'scraping');
    fs.writeFileSync(path.join(dataDirFinal, 'noticias-completas.json'), JSON.stringify(result, null, 2));

    console.log(`\n✨ Scraping PROFUNDO COMPLETADO. Total: ${allArticles.length} artículos con contenido enriquecido.`);
    console.log(`✅ Archivos actualizados en ${dataDirFinal}`);
}

runScraper();
