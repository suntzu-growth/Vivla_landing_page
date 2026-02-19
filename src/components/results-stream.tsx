"use client";

import { useState, useEffect, useRef } from "react";

// Modal de Galería de Imágenes
function ImageGalleryModal({ images, initialIndex, onClose }: { images: string[], initialIndex: number, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-light z-50"
      >
        ×
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-4 text-white hover:text-gray-300 text-5xl font-light z-50"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-4 text-white hover:text-gray-300 text-5xl font-light z-50"
          >
            ›
          </button>
        </>
      )}

      <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[currentIndex]}
          alt={`Imagen ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain"
        />
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}

// Función simple para convertir Markdown básico a HTML
function parseMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Negritas: **texto** → <strong>texto</strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Enlaces: [texto](url) → <a href="url">texto</a>
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-red-600 hover:underline">$1</a>')
    // Emojis de enlaces: 🔗 → mantener
    .replace(/🔗/g, '🔗');
}

export function ResultsStream({ isStreaming, results, text }: any) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // ✅ Ref para el interval
  const [modalImages, setModalImages] = useState<string[] | null>(null);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);

  const currentTypedTextRef = useRef(''); // ✅ Ref para seguir el progreso del tipado real

  const openImageModal = (images: string[], startIndex: number = 0) => {
    setModalImages(images);
    setModalInitialIndex(startIndex);
  };

  const closeImageModal = () => {
    setModalImages(null);
  };

  useEffect(() => {
    // ✅ CRÍTICO: Limpiar el interval anterior SIEMPRE que text cambie
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Si no hay texto o es "Consultando...", no hacer streaming
    if (!text || text === 'Consultando...') {
      setDisplayedText(text || '');
      currentTypedTextRef.current = text || '';
      setIsTyping(false);
      return;
    }

    // ✅ Detectar si el texto es una extensión para no resetear la animación
    const isExtension = text.startsWith(currentTypedTextRef.current) && currentTypedTextRef.current.length > 0;

    if (!isExtension) {
      setDisplayedText('');
      currentTypedTextRef.current = '';
      // Si el texto es corto, mostrar completo
      if (text.length < 50) {
        setDisplayedText(text);
        currentTypedTextRef.current = text;
        setIsTyping(false);
        return;
      }
    }

    // Streaming simulado: mostrar el texto progresivamente
    setIsTyping(true);
    let currentIndex = currentTypedTextRef.current.length;

    // Velocidad adaptativa
    const speed = text.length > 500 ? 10 : 20;

    intervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        const nextSpace = text.indexOf(' ', currentIndex + 1);
        const nextIndex = nextSpace === -1 ? text.length : nextSpace + 1;

        const newText = text.substring(0, nextIndex);
        setDisplayedText(newText);
        currentTypedTextRef.current = newText;
        currentIndex = nextIndex;
      } else {
        setIsTyping(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, speed);

    // Cleanup: cancelar interval cuando el componente se desmonte o text cambie
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text]);

  const htmlContent = parseMarkdown(displayedText);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Texto con soporte para Markdown */}
      <div
        className="text-lg leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: '"Host Grotesk", sans-serif',
          fontWeight: 300,
          letterSpacing: '-0.01em',
          lineHeight: '120%',
          color: 'inherit'
        }}
      />

      {/* Cursor parpadeante mientras escribe */}
      {(isStreaming || isTyping) && (
        <span className="inline-block w-2 h-5 ml-1 bg-red-600 animate-pulse" />
      )}

      {/* Tarjetas Visuales con Galería de Imágenes */}
      {/* Solo mostrar cuando termine de escribir el texto */}
      {!isTyping && results && results.length > 0 && (
        <div className="grid gap-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {results.map((item: any, idx: number) => (
            <div
              key={idx}
              className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all"
            >
              {/* Galería de Imágenes Mejorada */}
              {(item.images && item.images.length > 0) && (
                <div className="w-full p-3">
                  {/* Imagen Principal Grande - Clickeable */}
                  <div
                    className="relative w-full aspect-[16/9] overflow-hidden rounded-lg bg-gray-50 shadow-md border border-gray-100 cursor-pointer group"
                    onClick={() => openImageModal(item.images, 0)}
                  >
                    <img
                      src={item.images[0]}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                      alt={item.title}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 rounded-full p-3 shadow-lg">
                        <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                        </svg>
                      </div>
                    </div>
                    {item.images.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs">
                        +{item.images.length - 1}
                      </div>
                    )}
                  </div>

                  {/* Miniaturas Adicionales */}
                  {item.images.length > 1 && (
                    <div className="flex gap-2 mt-2">
                      {item.images.slice(1, 4).map((imgUrl: string, i: number) => (
                        <div
                          key={i}
                          className="flex-1 relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-50 border border-gray-100 cursor-pointer group/thumb"
                          onClick={() => openImageModal(item.images, i + 1)}
                        >
                          <img
                            src={imgUrl}
                            className="w-full h-full object-cover transition-all duration-300 group-hover/thumb:scale-105"
                            alt={`${item.title} ${i + 2}`}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Contenido de la Tarjeta */}
              <div className="px-4 pb-4" style={{ fontFamily: '"Host Grotesk", sans-serif', letterSpacing: '-0.01em' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest" style={{ fontWeight: 600 }}>
                    SUNTZU
                  </span>
                  {item.category && (
                    <span className="text-[10px] text-gray-400" style={{ fontWeight: 400 }}>
                      {item.category}
                    </span>
                  )}
                </div>
                <h3 className="text-gray-900 line-clamp-2" style={{ fontWeight: 600, fontSize: '18px' }}>
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3 leading-relaxed" style={{ fontWeight: 300 }}>
                    {item.summary}
                  </p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-3 text-xs text-black hover:gap-2 transition-all group/link"
                    style={{ fontWeight: 600 }}
                  >
                    Ver detalles
                    <svg className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Galería */}
      {modalImages && (
        <ImageGalleryModal
          images={modalImages}
          initialIndex={modalInitialIndex}
          onClose={closeImageModal}
        />
      )}
    </div>
  );
}