export function SearchHero() {
    return (
        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto py-4 md:pb-2 md:pt-6 space-y-3 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <img
                src="/suntzu_logo_centro.svg"
                alt="SunTzu"
                className="h-22 md:h-26 w-auto"
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
                Bienvenido a la forma moderna de vivir. Sea dueño de su segunda residencia sin las complicaciones de la propiedad total y acceda a nuestra red de viviendas para elevar su experiencia vacacional.
            </p>
        </div>
    );
}

