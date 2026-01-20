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

  const updateAssistantMessage = (content: string, streaming: boolean, results?: any[]) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
      
      if (lastIdx !== -1) {
        const lastMessage = updated[lastIdx];
        
        // Si el content de la herramienta es vacío o un espacio (como pedimos en el prompt),
        // mantenemos el texto del streaming que ya tiene los números y espacios.
        const isToolSummaryEmpty = !content || content.trim().length <= 1;
        const finalContent = isToolSummaryEmpty ? lastMessage.content : content;

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
            displayNewsResults: async ({ news, summary }: any) => {
              // Si el summary es " " o nulo, pasamos null para que la función mantenga el texto anterior
              const cleanSummary = (summary && summary.trim().length > 1) ? summary : null;
              updateAssistantMessage(cleanSummary, false, Array.isArray(news) ? news : [news]);
              return "Visuales desplegados";
            },
            displayTextResponse: async ({ text }: any) => {
              updateAssistantMessage(text, false);
              return "Texto actualizado";
            }
          },
          onMessage: (message: any) => {
            const text = message.message || message.text || '';
            if (!text) return;
            
            // Filtrado de mensajes iniciales repetitivos
            if (isFirstMessageRef.current && text.toLowerCase().includes("eitb")) return;
            isFirstMessageRef.current = false;

            if (message.role === 'agent' || message.type === 'text') {
               setMessages(prev => {
                 const updated = [...prev];
                 const lastIdx = updated.findLastIndex(m => m.role === 'assistant');
                 if (lastIdx !== -1) {
                    const baseContent = updated[lastIdx].content === 'Consultando...' ? '' : updated[lastIdx].content;
                    updated[lastIdx] = { ...updated[lastIdx], content: baseContent + text, isStreaming: true };
                 }
                 return updated;
               });
            }
          }
        });
        conversationRef.current = conversation;
        setAgentStatus('connected');
      } catch (e) { setAgentStatus('disconnected'); }
    };
    initAgent();
  }, []);

  const handleSearch = async (query: string, isCategorySelection: boolean = false) => {
    if (!query || agentStatus !== 'connected') return;

    let processedQuery = query;

    // CASO ESPECIAL: Si pulsa el botón "Noticias" de la landing
    if (query.toLowerCase() === "noticias" && !hasSearched) {
      setHasSearched(true);
      // Añadimos un mensaje de bienvenida del asistente directamente
      setMessages([{ role: 'assistant', content: '¡Hola! Soy el asistente de EITB. ¿De qué categoría te gustaría que busquemos noticias hoy? (Política, Economía, Deportes...)', isStreaming: false }]);
      // No enviamos mensaje al agente todavía, esperamos a que el usuario responda
      return;
    }

    // Si es una categoría específica (desde TopicSelector), ahí sí buscamos
    if (isCategorySelection) {
      processedQuery = `Busca noticias de ${query}`;
    }

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setHasSearched(true);
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: 'Consultando...', isStreaming: true }]);
    
    await conversationRef.current.sendUserMessage(processedQuery);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />
      <main className="flex-1 pt-16">
        {!hasSearched ? (
          <div className="max-w-4xl mx-auto flex flex-col items-center pt-12 px-6">
            <SearchHero />
            <QuestionMarquee onQuestionClick={handleSearch} />
            <TopicSelector onSelect={handleSearch} className="mt-8" />
            <div className="w-full mt-10"><SearchInput onSearch={handleSearch} /></div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 pb-40 space-y-10 pt-10 animate-in fade-in duration-500">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={msg.role === 'user' ? "bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md max-w-[80%]" : "w-full"}>
                  <ResultsStream isStreaming={!!msg.isStreaming} results={msg.results} text={msg.content || ""} />
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