"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/header";
import { SearchHero } from "@/components/search-hero";
import { SearchInput } from "@/components/search-input";
import { QuestionMarquee } from "@/components/question-marquee";
import { TopicSelector } from "@/components/topic-selector";
import { ResultsStream } from "@/components/results-stream";
import { Footer } from "@/components/footer";

export default function Home() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [messages, setMessages] = useState<any[]>([]);

  const conversationRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstMessageRef = useRef(true);
  const toolCalledInTurnRef = useRef<boolean>(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const updateAssistantMessage = (content: string | null, streaming: boolean, results?: any[], fromTool: boolean = false) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.findLastIndex(m => m.role === 'assistant');

      if (lastIdx !== -1) {
        const lastMessage = updated[lastIdx];

        let finalContent;
        if (fromTool) {
          finalContent = content || lastMessage.content;
        } else {
          const baseContent = (lastMessage.content === 'Consultando...' || lastMessage.content === '🔍 Buscando en SunTzu...') ? '' : lastMessage.content;
          finalContent = content ? baseContent + content : lastMessage.content;
        }

        updated[lastIdx] = {
          ...lastMessage,
          content: finalContent,
          isStreaming: streaming,
          results: results || lastMessage.results,
          timestamp: finalContent !== lastMessage.content ? Date.now() : lastMessage.timestamp
        };
      }
      return updated;
    });
    if (!streaming) setIsStreaming(false);
  };

  useEffect(() => {
    const initAgent = async () => {
      try {
        setAgentStatus('connecting');
        const { TextConversation } = await import('@elevenlabs/client');
        const res = await fetch("/api/get-signed-url");
        const { signedUrl } = await res.json();

        const conversation = await TextConversation.startSession({
          signedUrl,
          clientTools: {
            displayPropertyResults: async ({ properties, summary }: any) => {
              toolCalledInTurnRef.current = true;
              console.log('[Client Tool] displayPropertyResults:', { properties, summary });

              const propertiesArray = Array.isArray(properties) ? properties : [properties];

              // PASO 1: Extraer imágenes inline (las que vienen del LLM)
              const initialResults = propertiesArray.map((p) => {
                const rawString = JSON.stringify(p);
                const urlMatches = rawString.match(/https:\/\/[^"'\s\\]+/gi);

                let detectedImages = urlMatches ? urlMatches.map((url: string) => {
                  return url
                    .replace(/(Resumen:?|Fuente:?|URL:?|IMÁGENES:?|-$).*$/, '')
                    .replace(/[",\\]+$/, '')
                    .trim();
                }) : [];

                const finalImages = [...new Set(detectedImages)]
                  .filter(url => {
                    const low = url.toLowerCase();
                    return low.startsWith('http') &&
                      (low.includes('cdn') || low.includes('website-files.com') || /\.(jpg|jpeg|png|webp|gif|svg|avif)/.test(low));
                  })
                  .slice(0, 3);

                return { ...p, images: finalImages };
              });

              // PASO 2: Mostrar tarjetas INMEDIATAMENTE, preservando texto descriptivo previo
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
                if (lastIdx !== -1) {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    results: initialResults,
                    isStreaming: false
                  };
                }
                return updated;
              });

              // PASO 3: Auto-scrape en background para propiedades sin imágenes
              const needsScrape = initialResults.some(p => p.images.length < 3 && p.url);
              if (needsScrape) {
                Promise.all(initialResults.map(async (p, idx) => {
                  if (p.images.length >= 3 || !p.url) return p;
                  try {
                    console.log(`[Auto-Scrape] Obteniendo imágenes de ${p.url}`);
                    const response = await fetch('/api/scrape-images', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: p.url })
                    });
                    if (response.ok) {
                      const { images } = await response.json();
                      if (images && images.length > 0) {
                        const merged = [...p.images, ...images].slice(0, 3);
                        console.log(`[Auto-Scrape] ✅ ${p.title}: ${merged.length} imágenes`);
                        return { ...p, images: merged };
                      }
                    }
                  } catch (error) {
                    console.warn('[Auto-Scrape] Error:', error);
                  }
                  return p;
                })).then(updatedResults => {
                  // Actualizar solo las tarjetas con imágenes scraped, preservar texto
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
                    if (lastIdx !== -1) {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        results: updatedResults
                      };
                    }
                    return updated;
                  });
                });
              }

              return "Propiedades mostradas visualmente. No repitas la información.";
            }
          },
          onMessage: (message: any) => {
            console.log('[DEBUG] ElevenLabs Event:', message);
            const text = message.message || message.text || '';
            if (!text) return;

            // 1. Filtro de bienvenida
            if (isFirstMessageRef.current && text.includes("¡Hola! Soy el asistente")) {
              isFirstMessageRef.current = false;
              return;
            }

            // 2. Log de texto post-tool (no bloquear)
            if (toolCalledInTurnRef.current && message.role === 'agent') {
              console.log('[Agent] Texto post-tool recibido:', text.substring(0, 80));
            }

            // 3. Solo si pasa los filtros, actualizar mensaje
            if (message.role === 'agent' || message.type === 'text') {
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
                if (lastIdx !== -1) {
                  const currentContent = updated[lastIdx].content || '';

                  // Anti-duplicado: solo ignorar si el texto EXACTO ya está al final del contenido
                  const trimmedText = text.trim();
                  if (trimmedText && currentContent.endsWith(trimmedText)) {
                    console.log('[Agent] Texto duplicado ignorado:', trimmedText.substring(0, 50));
                    return prev;
                  }

                  const baseContent = (
                    currentContent === 'Consultando...' ||
                    currentContent === '🔍 Buscando en SunTzu...'
                  ) ? '' : currentContent;

                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: baseContent + text,
                    isStreaming: true
                  };
                }
                return updated;
              });
            }
          },
          onError: (error: any) => {
            console.error('[ElevenLabs ERROR]:', error);
          },
          onDisconnect: () => {
            console.warn('[ElevenLabs] Desconectado');
            setAgentStatus('disconnected');
          },
          onStatusChange: (status: any) => {
            console.log('[ElevenLabs Status Change]:', status);
          }
        });

        conversationRef.current = conversation;
        setAgentStatus('connected');
        console.log('[Agent] Conectado correctamente');

      } catch (e) {
        console.error('[Agent] Error de conexión:', e);
        setAgentStatus('disconnected');
      }
    };

    initAgent();
  }, []);

  const handleSearch = async (query: string, isCategorySelection: boolean = false) => {
    if (!query || agentStatus !== 'connected') return;

    // Reset flags de turno
    toolCalledInTurnRef.current = false;
    isFirstMessageRef.current = false;

    let processedQuery = query;

    if (isCategorySelection) {
      const categoryQueries: Record<string, string> = {
        'noticias': 'Háblame de las últimas noticias de la actualidad',
        'deportes': 'Dame las últimas noticias deportivas',
        'television': 'Háblame de la programación de televisión',
        'radio': 'Háblame de la programación de radio'
      };

      processedQuery = categoryQueries[query.toLowerCase()] || query;
    }

    setMessages(prev => [...prev, { role: 'user', content: processedQuery }]);
    setHasSearched(true);
    setIsStreaming(true);

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Consultando...',
      isStreaming: true,
      timestamp: Date.now()
    }]);

    console.log('[User] Enviando query:', processedQuery);
    console.log('[Timer] Inicio de búsqueda:', new Date().toISOString());
    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
      if (lastIdx !== -1) {
        updated[lastIdx].content = '🔍 Buscando en SunTzu...';
      }
      return updated;
    });
    await conversationRef.current.sendUserMessage(processedQuery);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header conversationId={conversationRef.current?.conversationId} />
      <main className="flex-1 pt-16">
        {!hasSearched ? (
          <>
            <div className="max-w-4xl mx-auto flex flex-col items-center pt-2 px-6">
              <SearchHero />

              <div className="mt-4 mb-1 h-4">
                {agentStatus === 'connected' && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                    ● Agente Conectado
                  </span>
                )}
                {agentStatus === 'connecting' && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 animate-pulse">
                    ○ Conectando...
                  </span>
                )}
                {agentStatus === 'disconnected' && (
                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                    ○ Desconectado
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 w-full max-w-4xl mx-auto px-6">
              <QuestionMarquee onQuestionClick={handleSearch} />
            </div>

            <div className="max-w-4xl mx-auto flex flex-col items-center px-6">
              <TopicSelector onSelect={(topic) => handleSearch(topic, true)} className="mt-3" />
              <div className="w-full mt-3"><SearchInput onSearch={handleSearch} /></div>
            </div>
          </>
        ) : (
          <div className="max-w-3xl mx-auto px-6 pb-32 space-y-10 pt-10 animate-in fade-in duration-500">
            {messages.map((msg, i) => (
              <div key={`msg-${i}-${msg.timestamp || i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={msg.role === 'user' ? "p-4 rounded-2xl rounded-tr-none shadow-md max-w-[80%]" : "w-full"}
                  style={msg.role === 'user' ? {
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontFamily: '"Host Grotesk", sans-serif',
                    fontWeight: 300,
                    letterSpacing: '-0.01em'
                  } : {
                    fontFamily: '"Host Grotesk", sans-serif',
                    fontWeight: 300,
                    letterSpacing: '-0.01em',
                    color: 'rgb(17, 89, 122)'
                  }}
                >
                  <ResultsStream
                    key={`stream-${i}-${msg.timestamp || i}`}
                    isStreaming={!!msg.isStreaming}
                    results={msg.results}
                    text={msg.content || ""}
                  />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        {hasSearched && (
          <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm border-t p-4 z-50">
            <div className="max-w-3xl mx-auto"><SearchInput onSearch={handleSearch} /></div>
          </div>
        )}
      </main>
      {!hasSearched && <Footer />}
    </div>
  );
}