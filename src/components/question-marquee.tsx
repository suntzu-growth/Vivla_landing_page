import { cn } from "@/lib/utils";

// ✅ HABILITADAS: Solo noticias y deportes
const QUESTIONS_ROW_1 = [
    "Casas de lujo en Menorca",
    "Áticos en Madrid con terraza",
    "Viviendas cerca de la playa",
    "Propiedades en el campo",
    "Inversiones inmobiliarias rentables",
];

const QUESTIONS_ROW_2 = [
    "Casas con piscina privada",
    "Oportunidades en Ibiza",
    "Chalets en la montaña",
    "Propiedades exclusivas en preventa",
    "Villas de diseño contemporáneo",
];

export function QuestionMarquee({ onQuestionClick }: { onQuestionClick?: (question: string) => void }) {
    return (
        <div className="w-full overflow-hidden space-y-4 py-8 pointer-events-none select-none relative z-0">
            {/* Masks for fade effect at edges */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent z-10"></div>
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent z-10"></div>

            {/* Row 1 */}
            <div className="flex w-max animate-marquee hover:[animation-play-state:paused] space-x-4">
                {[...QUESTIONS_ROW_1, ...QUESTIONS_ROW_1].map((q, i) => (
                    <div
                        key={i}
                        onClick={() => onQuestionClick?.(q)}
                        className="flex items-center px-5 py-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm text-gray-600 font-medium whitespace-nowrap text-xs md:text-sm cursor-pointer hover:bg-white hover:shadow-md hover:text-black transition-all pointer-events-auto active:scale-95"
                    >
                        {q}
                    </div>
                ))}
            </div>

            {/* Row 2 */}
            <div className="flex w-max animate-marquee-reverse hover:[animation-play-state:paused] space-x-4">
                {[...QUESTIONS_ROW_2, ...QUESTIONS_ROW_2].map((q, i) => (
                    <div
                        key={i}
                        onClick={() => onQuestionClick?.(q)}
                        className="flex items-center px-5 py-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm text-gray-600 font-medium whitespace-nowrap text-xs md:text-sm cursor-pointer hover:bg-white hover:shadow-md hover:text-black transition-all pointer-events-auto active:scale-95"
                    >
                        {q}
                    </div>
                ))}
            </div>
        </div>
    );
}
