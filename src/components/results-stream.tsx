"use client";

export function ResultsStream({ isStreaming, results, text }: any) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Texto del detalle o listado */}
      <div className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap font-sans">
        {text}
        {isStreaming && <span className="inline-block w-2 h-5 ml-1 bg-blue-600 animate-pulse" />}
      </div>

      {/* Tarjetas Visuales (Metadata + Link) */}
      {results && results.length > 0 && (
        <div className="grid gap-4 pt-6 border-t border-gray-100">
          {results.map((item: any, idx: number) => (
            <a 
              key={idx} 
              href={item.url} 
              target="_blank" 
              className="flex flex-col md:flex-row bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all group"
            >
              {item.image && (
                <div className="md:w-48 h-32 flex-shrink-0 bg-gray-100">
                  <img src={item.image} className="w-full h-full object-cover" alt="" />
                </div>
              )}
              <div className="p-4 flex-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Orain.eus</span>
                <h3 className="font-bold text-gray-900 group-hover:text-blue-700 line-clamp-2 mt-1">{item.title}</h3>
                {item.summary && <p className="text-xs text-gray-500 mt-2 line-clamp-3">{item.summary}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}