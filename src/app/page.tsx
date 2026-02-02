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
  const lastToolCallTimestamp = useRef<number>(0);
  const lastContentRef = useRef<string>(''); // ✅ Para detectar duplicados de herramientas
  const receivedToolTextRef = useRef<boolean>(false); // ✅ NUEVO: Indica que una herramienta ya dio el texto final

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const updateAssistantMessage = (content: string | null, streaming: boolean, results?: any[], fromTool: boolean = false) => {
    // ✅ NUEVO: Ignorar si el contenido es exactamente el mismo que el anterior
    if (fromTool && content && content === lastContentRef.current) {
      console.log('[DEBUG] Ignorando client tool duplicado - mismo contenido');
      return;
    }

    // ✅ NUEVO: Si viene de herramienta y trae texto, marcar que ya tenemos el texto final
    if (fromTool && content && content.trim().length > 0) {
      receivedToolTextRef.current = true;
      lastContentRef.current = content;
    }

    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.findLastIndex(m => m.role === 'assistant');

      if (lastIdx !== -1) {
        const lastMessage = updated[lastIdx];

        let finalContent;
        if (fromTool) {
          lastToolCallTimestamp.current = Date.now();
          finalContent = content || lastMessage.content;
        } else {
          const baseContent = lastMessage.content === 'Consultando...' ? '' : lastMessage.content;
          finalContent = content ? baseContent + content : lastMessage.content;
        }

        updated[lastIdx] = {
          ...lastMessage,
          content: finalContent,
          isStreaming: streaming,
          results: results || lastMessage.results,
          timestamp: Date.now()
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
            displayNewsResults: async ({ news, summary }: any) => {
              console.log('[Client Tool] displayNewsResults:', { news, summary });

              const cleanSummary = (summary && summary.trim().length > 1) ? summary : null;
              const newsArray = Array.isArray(news) ? news : [news];

              // ✅ NO enviamos el summary para que no sobreescriba el texto de displayTextResponse
              updateAssistantMessage(null, false, newsArray, true);
              return "Noticias mostradas correctamente";
            },

            displaySportsResults: async ({ news, summary }: any) => {
              console.log('[Client Tool] displaySportsResults:', { news, summary });

              const cleanSummary = (summary && summary.trim().length > 1) ? summary : null;
              const newsArray = Array.isArray(news) ? news : [news];

              // ✅ NO enviamos el summary para que no sobreescriba el texto de displayTextResponse
              updateAssistantMessage(null, false, newsArray, true);
              return "Deportes mostrados correctamente";
            },

            displayTextResponse: async ({ text }: any) => {
              console.log('[Client Tool] displayTextResponse:', text);
              updateAssistantMessage(text, false, undefined, true);
              return "Texto actualizado";
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
            const text = message.message || message.text || '';
            if (!text) return;

            // 1. Filtro de bienvenida (ya lo tienes)
            if (isFirstMessageRef.current && text.includes("¡Hola! Soy el asistente")) {
              isFirstMessageRef.current = false;
              return;
            }

            // 2. EL CAMBIO CLAVE:
            // Si ElevenLabs nos obliga a usar "Auto", enviará texto por el rol 'agent'.
            // Si ya detectamos que se va a usar una herramienta o ya se usó, 
            // bloqueamos el streaming de este turno para que no se pegue al final.
            if (receivedToolTextRef.current && message.role === 'agent') {
              console.log('[Agent] Bloqueando duplicado de streaming (Auto pre-speech)');
              return; 
            }

            // 3. Mantenemos tu filtro de seguridad por tiempo
            const timeSinceLastTool = Date.now() - lastToolCallTimestamp.current;
            if (timeSinceLastTool < 2000) return;

            // 4. Solo si pasa los filtros anteriores, actualizamos el mensaje
            if (message.role === 'agent' || message.type === 'text') {
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
                if (lastIdx !== -1) {
                  // Evitar que el streaming repita algo que ya está en el contenido
                  if (updated[lastIdx].content.includes(text.trim())) return prev;

                  const baseContent = updated[lastIdx].content === 'Consultando...' ? '' : updated[lastIdx].content;
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: baseContent + text,
                    isStreaming: true
                  };
                }
                return updated;
              });
            }
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

    // RESETEAR AQUÍ
    receivedToolTextRef.current = false; 
    lastContentRef.current = '';
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
          <div className="max-w-3xl mx-auto px-6 pb-40 space-y-10 pt-10 animate-in fade-in duration-500">
            {messages.map((msg, i) => (
              <div key={`msg-${i}-${msg.timestamp || i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={msg.role === 'user' ? "bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md max-w-[80%]" : "w-full"}>
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
          <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm border-t p-6 z-50">
            <div className="max-w-3xl mx-auto"><SearchInput onSearch={handleSearch} /></div>
          </div>
        )}
      </main>
      {!hasSearched && <Footer />}
    </div>
  );
}