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

              // Map output to include images array if present
              // [MEGA-PARSER] Aggressive URL collector and surgeon
              // AHORA TAMBIÉN ACEPTA 'image' (singular) de la versión simplificada
              const mappedResults = await Promise.all(propertiesArray.map(async (p) => {
                // Stringify the whole object to find URLs hidden in any field (images, image, image1, etc.)
                const rawString = JSON.stringify(p);

                // Regex: Broadly find all https links
                const urlMatches = rawString.match(/https:\/\/[^"'\s\\]+/gi);

                let detectedImages = urlMatches ? urlMatches.map((url: string) => {
                  // Surgical cleaning: Remove trailing PDF separators or tags
                  return url
                    .replace(/(Resumen:?|Fuente:?|URL:?|IMÁGENES:?|-$).*$/, '') // Cut off at any tag or trailing hyphen
                    .replace(/[",\\]+$/, '') // Trim JSON/String leftovers
                    .trim();
                }) : [];

                // Filter: Keep only links that look like images (CDN, common extensions)
                let finalImages = [...new Set(detectedImages)]
                  .filter(url => {
                    const low = url.toLowerCase();
                    return low.startsWith('http') &&
                      (low.includes('cdn') || low.includes('website-files.com') || /\.(jpg|jpeg|png|webp|gif|svg|avif)/.test(low));
                  })
                  .slice(0, 3);

                // 🚀 AUTO-SCRAPE: Si solo hay 1 imagen, scrapeamos la URL de la propiedad para obtener más
                if (finalImages.length < 3 && p.url) {
                  try {
                    console.log(`[Auto-Scrape] Obteniendo imágenes adicionales de ${p.url}`);
                    const response = await fetch('/api/scrape-images', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: p.url })
                    });

                    if (response.ok) {
                      const { images } = await response.json();
                      if (images && images.length > 0) {
                        // Combinar imágenes: la primera del LLM + las scraped
                        finalImages = [...finalImages, ...images].slice(0, 3);
                        console.log(`[Auto-Scrape] ✅ Obtenidas ${images.length} imágenes adicionales`);
                      }
                    }
                  } catch (error) {
                    console.warn('[Auto-Scrape] Error al obtener imágenes:', error);
                  }
                }

                return {
                  ...p,
                  images: finalImages
                };
              }));

              updateAssistantMessage(null, false, mappedResults, true);
              return "Propiedades mostradas visualmente al usuario. No generes texto adicional.";
            },

            displayTextResponse: async ({ text }: any) => {
              toolCalledInTurnRef.current = true;
              console.log('[Client Tool] displayTextResponse:', text);
              updateAssistantMessage(text, false, undefined, true);
              return "Texto mostrado al usuario. No generes texto adicional.";
            },

            saveUserData: async ({ name, email }: any) => {
              console.log('[Client Tool] saveUserData:', { name, email });
              try {
                const res = await fetch("/api/tools/save-user-data", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    email,
                    conversation_id: conversationRef.current?.conversationId
                  })
                });
                const data = await res.json();
                console.log('[Client Tool] saveUserData Response:', data);
                return "Datos guardados en el sheet (simulado)";
              } catch (e) {
                console.error('[Client Tool] Error saving data:', e);
                return "Error al guardar datos";
              }
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

            // 2. Bloquear todo texto post-tool en este turno
            if (toolCalledInTurnRef.current && message.role === 'agent') {
              console.log('[Agent] Bloqueando post-tool message');
              return;
            }

            // 3. Solo si pasa los filtros, actualizar mensaje
            if (message.role === 'agent' || message.type === 'text') {
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
                if (lastIdx !== -1) {
                  if (updated[lastIdx].content.includes(text.trim())) return prev;

                  const baseContent = (
                    updated[lastIdx].content === 'Consultando...' ||
                    updated[lastIdx].content === '🔍 Buscando en SunTzu...'
                  ) ? '' : updated[lastIdx].content;

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
          <div className="max-w-4xl mx-auto flex flex-col items-center pt-12 px-6">
            <SearchHero />

            <div className="mb-4 h-6">
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

            <QuestionMarquee onQuestionClick={handleSearch} />
            <TopicSelector onSelect={(topic) => handleSearch(topic, true)} className="mt-8" />
            <div className="w-full mt-10"><SearchInput onSearch={handleSearch} /></div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 pb-32 space-y-10 pt-10 animate-in fade-in duration-500">
            {messages.map((msg, i) => (
              <div key={`msg-${i}-${msg.timestamp || i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={msg.role === 'user' ? "p-4 rounded-2xl rounded-tr-none shadow-md max-w-[80%] text-white" : "w-full"}
                  style={msg.role === 'user' ? {
                    backgroundColor: '#000000',
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 400
                  } : {
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 300
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