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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const updateAssistantMessage = (content: string | null, streaming: boolean, results?: any[]) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
      
      if (lastIdx !== -1) {
        const lastMessage = updated[lastIdx];
        
        // Si content es null o vacío, mantener el texto actual
        const finalContent = content ? content : lastMessage.content;

        updated[lastIdx] = {
          ...lastMessage,
          content: finalContent,
          isStreaming: streaming,
          results: results || lastMessage.results
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
              
              // Si summary es " " o vacío, pasar null para mantener texto actual
              const cleanSummary = (summary && summary.trim().length > 1) ? summary : null;
              const newsArray = Array.isArray(news) ? news : [news];
              
              updateAssistantMessage(cleanSummary, false, newsArray);
              return "Noticias mostradas correctamente";
            },
            
            // Client Tool para Deportes
            displaySportsResults: async ({ news, summary }: any) => {
              console.log('[Client Tool] displaySportsResults:', { news, summary });
              
              const cleanSummary = (summary && summary.trim().length > 1) ? summary : null;
              const newsArray = Array.isArray(news) ? news : [news];
              
              updateAssistantMessage(cleanSummary, false, newsArray);
              return "Deportes mostrados correctamente";
            },
            
            // Client Tool genérico
            displayTextResponse: async ({ text }: any) => {
              console.log('[Client Tool] displayTextResponse:', text);
              updateAssistantMessage(text, false);
              return "Texto actualizado";
            }
          },
          onMessage: (message: any) => {
            const text = message.message || message.text || '';
            if (!text) return;
            
            // Filtrar mensajes iniciales con "EITB" o "Hola! Soy tu Asistente"
            const lowerText = text.toLowerCase();
            if (isFirstMessageRef.current && 
                (lowerText.includes("eitb") || 
                 lowerText.includes("hola! soy") ||
                 lowerText.includes("especializado en"))) {
              console.log('[Agent] Mensaje inicial filtrado:', text);
              return;
            }
            
            isFirstMessageRef.current = false;

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

    // Resetear flag de primer mensaje al hacer nueva búsqueda
    isFirstMessageRef.current = true;

    let processedQuery = query;

    // Si viene del TopicSelector, es una categoría
    if (isCategorySelection) {
      processedQuery = `Hablame de las últimas ${query} de la actualidad`;
    }

    // Añadir mensaje del usuario (mostramos el processedQuery en el chat)
    setMessages(prev => [...prev, { role: 'user', content: processedQuery }]);
    setHasSearched(true);
    setIsStreaming(true);
    
    // Placeholder "Consultando..."
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: 'Consultando...', 
      isStreaming: true 
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
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={msg.role === 'user' ? "bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md max-w-[80%]" : "w-full"}>
                  <ResultsStream 
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