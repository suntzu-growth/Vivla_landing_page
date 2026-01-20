"use client";

export function ResultsStream({ isStreaming, results, text }: any) {
  return (
    <div className="w-full space-y-6">
      {/* Texto del Asistente: whitespace-pre-wrap permite los saltos de línea de la IA */}
      <div className="text-gray-900 text-[17px] leading-relaxed whitespace-pre-wrap break-words">
        {text}
        {isStreaming && <span className="inline-block w-2 h-5 ml-1 bg-blue-600 animate-pulse align-middle" />}
      </div>

      {/* Grid de resultados visuales */}
      {results && results.length > 0 && (
        <div className="grid gap-4 border-t border-gray-100 pt-6 animate-in slide-in-from-bottom-2">
          {results.map((item: any, idx: number) => (
            <a 
              key={idx} 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col sm:flex-row bg-gray-50 rounded-xl overflow-hidden hover:bg-white border border-transparent hover:border-blue-200 transition-all shadow-sm"
            >
              {item.image && (
                <div className="sm:w-32 h-24 flex-shrink-0">
                  <img src={item.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                </div>
              )}
              <div className="p-4 flex-1">
                <h3 className="font-bold text-sm text-gray-900 group-hover:text-blue-700 line-clamp-2 leading-tight">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="text-[11px] text-gray-500 mt-2 line-clamp-2 leading-normal">
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