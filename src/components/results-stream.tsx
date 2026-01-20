"use client";

import { useEffect, useState } from "react";

export function ResultsStream({ isStreaming, results, text }: any) {
    const [displayedText, setDisplayedText] = useState(text || "");
    const [isFinished, setIsFinished] = useState(!isStreaming);

    useEffect(() => {
        setDisplayedText(text || "");
        setIsFinished(!isStreaming);
    }, [isStreaming, text]);

    if (!isStreaming && !displayedText && (!results || results.length === 0)) return null;

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* INTRO DEL AGENTE */}
            <div className="prose prose-lg font-serif text-gray-800 leading-relaxed text-lg whitespace-pre-wrap">
                {displayedText === "Consultando..." ? (
                    <span className="text-gray-400 italic">Consultando Orain.eus...</span>
                ) : displayedText}
                {isStreaming && <span className="inline-block w-2 h-5 ml-1 bg-blue-600 animate-pulse" />}
            </div>

            {/* TARJETAS DE PREVIA (LINKS REDIRECCIONABLES) */}
            {isFinished && results && results.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-gray-100">
                    <div className="grid gap-4">
                        {results.map((item: any, idx: number) => (
                            <a 
                                key={idx} 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group bg-[#f8f9fa] border border-gray-200 rounded-xl overflow-hidden hover:bg-white hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col"
                            >
                                {item.image && (
                                    <div className="w-full h-48 overflow-hidden bg-gray-200 relative">
                                        <img 
                                            src={item.image} 
                                            alt="" 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                        />
                                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{item.source}</span>
                                        <span className="text-[10px] text-gray-400">• orain.eus</span>
                                    </div>
                                    <h3 className="font-serif font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-700 transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed italic">
                                        {item.summary}
                                    </p>
                                    <div className="mt-3 flex items-center text-blue-500 text-[10px] font-mono truncate opacity-60 group-hover:opacity-100">
                                        {item.url}
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}