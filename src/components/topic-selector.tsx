"use client";

import { cn } from "@/lib/utils";

const TOPICS = [
    { id: "norte-merida", label: "Norte de Mérida", query: "Norte de Mérida", disabled: false },
    { id: "costa-esmeralda", label: "Costa Esmeralda", query: "Costa Esmeralda", disabled: false },
    { id: "campo-golf", label: "Campo de Golf", query: "Campo de Golf", disabled: false },
    { id: "haciendas", label: "Haciendas", query: "Haciendas", disabled: false },
    { id: "naturaleza", label: "Naturaleza", query: "Naturaleza", disabled: false },
];

interface TopicSelectorProps {
    onSelect: (topic: string) => void;
    className?: string;
}

export function TopicSelector({ onSelect, className }: TopicSelectorProps) {
    return (
        <div className={cn("flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200", className)}>
            {TOPICS.map((topic) => (
                <button
                    key={topic.id}
                    onClick={() => !topic.disabled && onSelect(topic.query)}
                    disabled={topic.disabled}
                    className={cn(
                        "px-3 py-1.5 border rounded-full text-xs transition-all shadow-sm",
                        // Estilos para botón habilitado
                        !topic.disabled && "bg-white/80 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-black hover:text-black hover:bg-gray-50 cursor-pointer",
                        // Estilos para botones deshabilitados
                        topic.disabled && "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60 grayscale"
                    )}
                    style={{
                        fontFamily: '"Host Grotesk", sans-serif',
                        fontWeight: 300,
                        letterSpacing: '-0.01em'
                    }}
                >
                    {topic.label}
                </button>
            ))}
        </div>
    );
}