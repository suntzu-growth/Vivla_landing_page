export function SearchHero() {
    return (
        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto py-3 md:pb-2 md:pt-4 space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <img
                src="/suntzu_logo_centro.svg"
                alt="SunTzu"
                className="h-24 md:h-28 w-auto"
            />
            <p
                className="text-base md:text-lg max-w-xl mx-auto px-4"
                style={{
                    fontFamily: '"Inter", "Host Grotesk", sans-serif',
                    fontWeight: 300,
                    letterSpacing: '-0.01em',
                    lineHeight: '120%',
                    color: 'rgb(17, 89, 122)'
                }}
            >
                Descubre residencias vacacionales exclusivas en Mérida y la costa yucateca, diseñadas para disfrutar, invertir y crear experiencias únicas durante todo el año.
            </p>
        </div>
    );
}

