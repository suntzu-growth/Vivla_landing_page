import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url || !url.includes('realestate-viviendas.vercel.app')) {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
        }

        console.log(`[Scrape Images API] Fetching: ${url}`);

        // Fetch the property page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract all image URLs from the page
        const images: string[] = [];

        // Strategy 1: Look for og:image meta tags
        $('meta[property="og:image"]').each((_, el) => {
            const content = $(el).attr('content');
            if (content) images.push(content);
        });

        // Strategy 2: Look for images in common gallery containers
        $('.property-gallery img, .listing-images img, [class*="gallery"] img, [class*="slider"] img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && src.startsWith('http')) images.push(src);
        });

        // Strategy 3: All CDN images
        $('img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && (src.includes('cdn') || src.includes('website-files.com'))) {
                images.push(src);
            }
        });

        // Deduplicate and filter
        const uniqueImages = [...new Set(images)]
            .filter(img =>
                img.startsWith('http') &&
                /\.(jpg|jpeg|png|webp|gif|avif)/.test(img.toLowerCase())
            )
            .slice(0, 3);

        console.log(`[Scrape Images API] Found ${uniqueImages.length} images`);

        return NextResponse.json({ images: uniqueImages });

    } catch (error: any) {
        console.error('[Scrape Images API] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
