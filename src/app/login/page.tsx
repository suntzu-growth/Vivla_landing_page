'use client'

import { useActionState } from 'react'
import { login } from './actions'

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, null)

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-8">
                    <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
                        Acceso Privado
                    </h1>

                    <form action={formAction} className="space-y-6">
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            >
                                Usuario
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0484cd] dark:bg-zinc-700 dark:text-white"
                                placeholder="Introduzca su usuario"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            >
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0484cd] dark:bg-zinc-700 dark:text-white"
                                placeholder="Introduzca su contraseña"
                            />
                        </div>

                        {state?.error && (
                            <div className="text-red-500 text-sm text-center">
                                {state.error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-[#0484cd] hover:bg-[#0369a1] text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50"
                        >
                            {isPending ? 'Verificando...' : 'Entrar'}
                        </button>
                    </form>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-900 px-8 py-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        &copy; 2026 EITB. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    )
}
