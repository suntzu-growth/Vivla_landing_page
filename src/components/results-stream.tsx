"use client";

import { useState, useEffect, useRef } from "react";

// Función simple para convertir Markdown básico a HTML
function parseMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Negritas: **texto** → <strong>texto</strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Enlaces: [texto](url) → <a href="url">texto</a>
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>')
    // Emojis de enlaces: 🔗 → mantener
    .replace(/🔗/g, '🔗');
}

export function ResultsStream({ isStreaming, results, text }: any) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // ✅ Ref para el interval

  const currentTypedTextRef = useRef(''); // ✅ Ref para seguir el progreso del tipado real

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
        className="text-inherit text-lg leading-relaxed font-sans"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{ whiteSpace: 'pre-wrap' }}
      />

      {/* Cursor parpadeante mientras escribe */}
      {(isStreaming || isTyping) && (
        <span className="inline-block w-2 h-5 ml-1 bg-blue-600 animate-pulse" />
      )}

      {/* Tarjetas Visuales (Metadata + Link) */}
      {/* Solo mostrar cuando termine de escribir el texto */}
      {!isTyping && results && results.length > 0 && (
        <div className="grid gap-4 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {results.map((item: any, idx: number) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col md:flex-row bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all group"
            >
              {item.image && (
                <div className="md:w-48 h-32 flex-shrink-0 bg-gray-100">
                  <img
                    src={item.image}
                    className="w-full h-full object-cover"
                    alt={item.title || 'Noticia'}
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="p-4 flex-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  EITB
                </span>
                <h3 className="font-bold text-gray-900 group-hover:text-blue-700 line-clamp-2 mt-1">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-3">
                    {item.summary}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}