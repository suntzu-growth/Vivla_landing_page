const fs = require('fs');
const path = require('path');

console.log('📄 Iniciando conversión de JSON a HTML optimizado para RAG...');

const inputPath = './data/scraping/noticias-completas.json';
const outputPath = './data/rag/propiedades-suntzu.html';

if (!fs.existsSync(inputPath)) {
    console.error('❌ No se encontró el archivo de propiedades.');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const articles = data.articles;

console.log(`✅ Cargadas ${articles.length} propiedades`);

// Generar HTML
let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Catálogo de Propiedades - SunTzu Real Estate</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .property { margin-bottom: 40px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .property h2 { color: #2c3e50; margin-top: 0; }
        .property-meta { color: #7f8c8d; font-size: 0.9em; margin-bottom: 10px; }
        .property-images { display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap; }
        .property-images img { max-width: 300px; height: auto; border-radius: 4px; }
        .property-specs { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .property-content { margin: 15px 0; }
        .property-url { display: inline-block; margin-top: 10px; padding: 8px 16px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; }
        .property-url:hover { background: #2980b9; }
    </style>
</head>
<body>
    <h1>Catálogo de Propiedades - SunTzu Real Estate</h1>
    <p><strong>Total de propiedades:</strong> ${articles.length}</p>
    <p><strong>Última actualización:</strong> ${data.timestamp}</p>
    <hr>
`;

// Procesar cada propiedad
articles.forEach((property, index) => {
    const images = property.images || (property.image ? [property.image] : []);
    const cleanedImages = images.filter(img => img && img.startsWith('http'));

    html += `
    <article class="property" id="property-${index + 1}">
        <h2>${property.title || 'Propiedad Sin Nombre'}</h2>

        <div class="property-meta">
            <strong>ID:</strong> ${property.id} |
            <strong>Categoría:</strong> ${property.category || 'inmobiliaria'}
        </div>

        ${cleanedImages.length > 0 ? `
        <div class="property-images">
            ${cleanedImages.map((img, i) => `
            <img src="${img}" alt="${property.title} - Imagen ${i + 1}" loading="lazy">
            `).join('')}
        </div>
        ` : ''}

        <div class="property-specs">
            <strong>📋 Especificaciones:</strong><br>
            ${property.summary || 'No disponible'}
        </div>

        ${property.content ? `
        <div class="property-content">
            <strong>📝 Descripción:</strong><br>
            ${property.content.split('\n\n').map(p => `<p>${p}</p>`).join('')}
        </div>
        ` : ''}

        <a href="${property.url}" class="property-url" target="_blank">Ver Detalles Completos →</a>
    </article>
    `;
});

html += `
    <hr>
    <footer style="text-align: center; margin-top: 40px; color: #7f8c8d;">
        <p><strong>SunTzu Real Estate</strong> - Base de Conocimientos generada automáticamente</p>
        <p>Total: ${articles.length} propiedades | Generado: ${new Date().toLocaleString('es-ES')}</p>
    </footer>
</body>
</html>
`;

// Guardar archivo
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, html);

console.log(`✅ HTML generado con éxito en: ${outputPath}`);
console.log(`📊 Propiedades procesadas: ${articles.length}`);
console.log(`🖼️ Total de imágenes incluidas: ${articles.reduce((acc, p) => {
    const imgs = p.images || (p.image ? [p.image] : []);
    return acc + imgs.filter(img => img && img.startsWith('http')).length;
}, 0)}`);
