"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Header() {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);

    const handleLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        // Recargar la página para resetear el estado
        window.location.href = '/';
    };

    const handleCreateAccount = () => {
        setShowModal(true);
    };

    return (
        <>
            <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Logo - Clickeable para volver al inicio */}
                    <a 
                        href="/" 
                        onClick={handleLogoClick}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <div className="relative w-24 h-8">
                            <img
                                src="/eitb-logo.png"
                                alt="EITB - Volver al inicio"
                                className="object-contain w-full h-full"
                            />
                        </div>
                    </a>

                    {/* Botón de Crear cuenta */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleCreateAccount}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                        >
                            Crear cuenta
                        </button>
                    </div>
                </div>
            </header>

            {/* Modal de Registro */}
            {showModal && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Icono de personalización */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                            Experiencia Personalizada
                        </h2>
                        <p className="text-gray-600 mb-6 text-center">
                            El registro estará disponible próximamente. Con tu cuenta podrás:
                        </p>
                        
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-gray-700">
                                    <strong>Recibir recomendaciones personalizadas</strong> basadas en tus intereses
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-gray-700">
                                    <strong>Seguir a tus equipos vascos favoritos</strong> (Athletic, Real Sociedad, Alavés...)
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-gray-700">
                                    <strong>Guardar tus noticias favoritas</strong> para leerlas después
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-gray-700">
                                    <strong>Recordar tus preferencias</strong> de idioma y categorías
                                </span>
                            </li>
                        </ul>

                        <button
                            onClick={() => setShowModal(false)}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Entendido, ¡gracias!
                        </button>

                        <p className="text-xs text-gray-500 mt-4 text-center">
                            Eskerrik asko por tu interés en EITB 🙏
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}