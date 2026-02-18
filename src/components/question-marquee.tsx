import { cn } from "@/lib/utils";

// ✅ HABILITADAS: Solo noticias y deportes
const QUESTIONS_ROW_1 = [
    "Villas cerca del mar en Chicxulub",
    "Casas con alberca en el norte de Mérida",
    "Casas dentro de Yucatán Country Club",
];

const QUESTIONS_ROW_2 = [
    "Villas cerca del campo de golf El Jaguar",
    "Casas frente al mar en Sisal",
    "Villas cerca de reservas naturales",
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
                        className="flex items-center px-5 py-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm text-gray-600 whitespace-nowrap text-xs md:text-sm cursor-pointer hover:bg-white hover:shadow-md hover:text-black transition-all pointer-events-auto active:scale-95"
                        style={{
                            fontFamily: '"Host Grotesk", sans-serif',
                            fontWeight: 300,
                            letterSpacing: '-0.01em'
                        }}
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
                        className="flex items-center px-5 py-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm text-gray-600 whitespace-nowrap text-xs md:text-sm cursor-pointer hover:bg-white hover:shadow-md hover:text-black transition-all pointer-events-auto active:scale-95"
                        style={{
                            fontFamily: '"Host Grotesk", sans-serif',
                            fontWeight: 300,
                            letterSpacing: '-0.01em'
                        }}
                    >
                        {q}
                    </div>
                ))}
            </div>
        </div>
    );
}
