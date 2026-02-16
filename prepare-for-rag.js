const fs = require('fs');
const path = require('path');

async function prepareForRag() {
    console.log('📊 Preparando datos para RAG...');

    const inputPath = './data/scraping/noticias-completas.json';
    const outputDir = './data/rag';

    if (!fs.existsSync(inputPath)) {
        console.error('❌ No se encontró el archivo de noticias. Ejecuta primero run-scraper.js');
        return;
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const articles = data.articles;

    console.log(`✅ Cargados ${articles.length} artículos`);

    // 1. LangChain Format
    console.log('🔗 Generando formato LangChain...');
    const langchainDocs = articles.map(a => {
        const imgList = (a.images && a.images.length > 0) ? a.images.join(', ') : (a.image || "");
        return {
            pageContent: `Título: ${a.title}\nURL: ${a.url}\nImágenes: ${imgList}\nResumen: ${a.summary}\n\nContenido: ${a.content || a.summary}`,
            metadata: {
                source: a.url,
                image: a.image,
                images: a.images || (a.image ? [a.image] : []),
                title: a.title,
                category: a.category,
                date: a.publishDate || a.scrapedAt,
                author: 'SunTzu'
            }
        };
    });
    fs.writeFileSync(path.join(outputDir, 'langchain-documents.json'), JSON.stringify(langchainDocs, null, 2));

    // 2. Vector DB Ready (with IDs)
    console.log('🔢 Generando formato Vector Database...');
    const vectorDocs = articles.map(a => {
        const imgList = (a.images && a.images.length > 0) ? a.images.join(', ') : (a.image || "");
        return {
            id: a.id,
            text: `Título: ${a.title}. URL: ${a.url}. Imágenes: ${imgList}. Resumen: ${a.summary}. Contenido: ${a.content || ""}`,
            metadata: {
                url: a.url,
                image: a.image,
                images: a.images || (a.image ? [a.image] : []),
                category: a.category,
                source: a.source
            }
        };
    });
    fs.writeFileSync(path.join(outputDir, 'vectordb-ready.json'), JSON.stringify(vectorDocs, null, 2));

    // 3. Chunked Documents (500 words approx)
    console.log('📦 Generando formato chunked (500 palabras)...');
    const chunks = [];
    articles.forEach(a => {
        const imgList = (a.images && a.images.length > 0) ? a.images.join(', ') : (a.image || "");
        const header = `Título: ${a.title}\nURL: ${a.url}\nImágenes: ${imgList}\nResumen: ${a.summary}\n\n`;
        const bodyContent = a.content || a.summary;
        const words = bodyContent.split(/\s+/);
        const chunkSize = 500;

        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push({
                articleId: a.id,
                chunkIndex: Math.floor(i / chunkSize),
                content: header + words.slice(i, i + chunkSize).join(' '),
                metadata: { url: a.url, title: a.title, image: a.image, images: a.images }
            });
        }
    });
    fs.writeFileSync(path.join(outputDir, 'chunked-documents.json'), JSON.stringify(chunks, null, 2));

    // 5. TXT for direct RAG (Simplified for ElevenLabs Knowledge Base)
    console.log('📝 Generando rag-content.txt...');
    let fullTxt = "";
    articles.forEach(a => {
        const imgList = (a.images && a.images.length > 0) ? a.images.join('\n- ') : (a.image || "No disponible");
        fullTxt += `=== PROPIEDAD ===\nTítulo: ${a.title}\nURL: ${a.url}\nImágenes:\n- ${imgList}\nResumen: ${a.summary}\nContenido: ${a.content || a.summary}\n\n`;
    });
    fs.writeFileSync(path.join(outputDir, 'rag-content.txt'), fullTxt);

    // 4. CSV for Excel
    console.log('📄 Generando CSV...');
    let csv = 'Title,Category,URL,Source\n';
    articles.forEach(a => {
        const safeTitle = a.title.replace(/"/g, '""');
        csv += `"${safeTitle}","${a.category}","${a.url}","${a.source}"\n`;
    });
    fs.writeFileSync(path.join(outputDir, 'articles.csv'), csv);

    console.log('\n✨ Procesamiento RAG completado con éxito.');
}

prepareForRag();
