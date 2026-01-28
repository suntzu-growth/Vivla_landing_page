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
  const lastToolCallTimestamp = useRef<number>(0); // ✅ Timestamp del último client tool

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const updateAssistantMessage = (content: string | null, streaming: boolean, results?: any[], fromTool: boolean = false) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
      
      if (lastIdx !== -1) {
        const lastMessage = updated[lastIdx];
        
        // ✅ Si viene de un Client Tool, marcar timestamp y reemplazar
        // ✅ Si es streaming, concatenar
        let finalContent;
        if (fromTool) {
          // Marcar que acabamos de recibir respuesta de un client tool
          lastToolCallTimestamp.current = Date.now();
          // Reemplazar completamente con el nuevo contenido del tool
          finalContent = content || lastMessage.content;
        } else {
          // Streaming normal: concatenar
          const baseContent = lastMessage.content === 'Consultando...' ? '' : lastMessage.content;
          finalContent = content ? baseContent + content : lastMessage.content;
        }

        updated[lastIdx] = {
          ...lastMessage,
          content: finalContent,
          isStreaming: streaming,
          results: results || lastMessage.results,
          timestamp: Date.now() // ✅ Key única para React
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
            // Client Tool para Noticias
            displayNewsResults: async ({ news, summary }: any) => {
              console.log('[Client Tool] displayNewsResults:', { news, summary });
              
              const cleanSummary = (summary && summary.trim().length > 1) ? summary : null;
              const newsArray = Array.isArray(news) ? news : [news];
              
              updateAssistantMessage(cleanSummary, false, newsArray, true); // fromTool = true
              return "Noticias mostradas correctamente";
            },
            
            // Client Tool para Deportes
            displaySportsResults: async ({ news, summary }: any) => {
              console.log('[Client Tool] displaySportsResults:', { news, summary });
              
              const cleanSummary = (summary && summary.trim().length > 1) ? summary : null;
              const newsArray = Array.isArray(news) ? news : [news];
              
              updateAssistantMessage(cleanSummary, false, newsArray, true); // fromTool = true
              return "Deportes mostrados correctamente";
            },
            
            // Client Tool genérico - ESTE ES EL IMPORTANTE PARA NOTICIAS
            displayTextResponse: async ({ text }: any) => {
              console.log('[Client Tool] displayTextResponse:', text);
              console.log('[Client Tool] Texto incluye **?:', text.includes('**'));
              updateAssistantMessage(text, false, undefined, true); // fromTool = true
              return "Texto actualizado";
            }
          },
          onMessage: (message: any) => {
            const text = message.message || message.text || '';
            if (!text) return;
            
            // SOLO filtrar el mensaje de bienvenida inicial EXACTO
            // y SOLO si es el primer mensaje de la sesión
            if (isFirstMessageRef.current && 
                text === "¡Hola! Soy el asistente de EITB. Por ahora puedo ayudarte con las últimas noticias de actualidad del País Vasco. ¿Qué te gustaría saber?") {
              console.log('[Agent] Mensaje de bienvenida filtrado');
              isFirstMessageRef.current = false;
              return;
            }
            
            // Marcar que ya no es el primer mensaje después del primer onMessage
            if (isFirstMessageRef.current) {
              isFirstMessageRef.current = false;
            }

            // ✅ NUEVO: Ignorar streaming que llega inmediatamente después de un client tool
            // Esto evita duplicados cuando ElevenLabs envía el mismo texto por ambos canales
            const timeSinceLastTool = Date.now() - lastToolCallTimestamp.current;
            if (timeSinceLastTool < 500) { // Ventana de 500ms
              console.log('[Agent] Ignorando streaming duplicado (recién vino de client tool)');
              return;
            }

            // Streaming de texto
            if (message.role === 'agent' || message.type === 'text') {
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
                if (lastIdx !== -1) {
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

    // Resetear flag del mensaje inicial
    isFirstMessageRef.current = false;

    let processedQuery = query;

    // Si viene del TopicSelector, es una categoría
    if (isCategorySelection) {
      // Mapear categorías a queries apropiadas
      const categoryQueries: Record<string, string> = {
        'noticias': 'Háblame de las últimas noticias de la actualidad',
        'deportes': 'Dame las últimas noticias deportivas',
        'television': 'Háblame de la programación de televisión',
        'radio': 'Háblame de la programación de radio'
      };
      
      processedQuery = categoryQueries[query.toLowerCase()] || query;
    }

    // Añadir mensaje del usuario
    setMessages(prev => [...prev, { role: 'user', content: processedQuery }]);
    setHasSearched(true);
    setIsStreaming(true);
    
    // Placeholder "Consultando..."
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: 'Consultando...', 
      isStreaming: true,
      timestamp: Date.now() // ✅ Key única para React
    }]);
    
    console.log('[User] Enviando query:', processedQuery);
    await conversationRef.current.sendUserMessage(processedQuery);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />
      <main className="flex-1 pt-16">
        {!hasSearched ? (
          <div className="max-w-4xl mx-auto flex flex-col items-center pt-12 px-6">
            <SearchHero />
            
            {/* Indicador de estado del agente */}
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