"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/header";
import { SearchHero } from "@/components/search-hero";
import { SearchInput } from "@/components/search-input";
import { QuestionMarquee } from "@/components/question-marquee";
import { TopicSelector } from "@/components/topic-selector";
import { ResultsStream } from "@/components/results-stream";
import { Footer } from "@/components/footer";

import { ScheduleParser } from "@/lib/schedule-parser";
import { scheduleData } from "@/data/schedule-loader";
import { SIMULATED_ANSWERS } from "@/data/simulated-answers";

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  results?: any[];
  isStreaming?: boolean;
  directAnswer?: string;
}

export default function Home() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAgentEnabled, setIsAgentEnabled] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const conversationRef = useRef<any>(null);
  const [accumulatedText, setAccumulatedText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize text-only conversation with ElevenLabs
  useEffect(() => {
    const initConversation = async () => {
      try {
        // Dynamically import to avoid SSR issues
        const { TextConversation } = await import('@elevenlabs/client');

        const response = await fetch("/api/get-signed-url");
        if (!response.ok) throw new Error("Failed to get signed URL");

        const { signedUrl } = await response.json();

        const conversation = await TextConversation.startSession({
          signedUrl,
          onMessage: (message: any) => {
            console.log('[Agent Message]:', message);

            // Handle text messages from agent
            if (message.type === 'conversation_initiation_metadata') {
              console.log('[Agent] Conversation initiated');
              return;
            }

            // Extract text from various possible message structures
            const text = message.message || message.text || '';
            if (text && message.role === 'agent') {
              setAccumulatedText(prev => prev + text);
            }
          },
          onError: (error: any) => {
            console.error('[Agent Error]:', error);
            setIsAgentEnabled(false);
          },
          onDisconnect: () => {
            console.log('[Agent] Disconnected');
            setIsAgentEnabled(false);
          },
        });

        conversationRef.current = conversation;
        setIsAgentEnabled(true);
        console.log('[Agent] Connected (Text-Only)');

      } catch (err) {
        console.error("Failed to initialize text agent:", err);
        setIsAgentEnabled(false);
      }
    };

    initConversation();

    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession?.();
      }
    };
  }, []);

  // Update messages when accumulated text changes
  useEffect(() => {
    if (accumulatedText && isStreaming) {
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: accumulatedText,
            isStreaming: true,
          };
        }
        return updated;
      });
    }
  }, [accumulatedText, isStreaming]);

  const handleSearch = async (query?: string, isCategorySelection: boolean = false) => {
    if (!query) return;

    // Add user message
    const userMsg: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setHasSearched(true);
    setIsStreaming(true);
    setAccumulatedText("");

    // Add placeholder for response
    setMessages(prev => [...prev, { role: 'assistant', isStreaming: true }]);

    if (isAgentEnabled && conversationRef.current) {
      try {
        // Si es una selección de categoría, le damos una instrucción clara al Router
        const prompt = isCategorySelection
          ? `Por favor, llévame a la sección de ${query}` 
          : query;

        await conversationRef.current.sendUserMessage(prompt);

        // Wait a bit for response to accumulate
        setTimeout(() => {
          setMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                isStreaming: false,
              };
            }
            return updated;
          });
          setIsStreaming(false);
        }, 3000);

      } catch (err: any) {
        console.error("Agent error:", err);
        setIsStreaming(false);
      }
    } else {
      // Fallback mode (local simulation)
      setTimeout(() => {
        let assistantMsg: Message = { role: 'assistant', isStreaming: true };

        if (query && SIMULATED_ANSWERS[query]) {
          assistantMsg = {
            role: 'assistant',
            directAnswer: SIMULATED_ANSWERS[query],
            isStreaming: false
          };
        } else {
          const parser = new ScheduleParser(scheduleData);
          const results = parser.search(query || "");
          assistantMsg = { role: 'assistant', results: results, isStreaming: false };
        }

        setMessages(prev => {
          const history = prev.slice(0, -1);
          return [...history, assistantMsg];
        });
        setIsStreaming(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-eitb-blue/20 selection:text-eitb-blue flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col relative pt-16">
        {/* Hero */}
        <div className={`transition-all duration-700 ease-in-out flex flex-col items-center w-full ${hasSearched ? "hidden" : "pt-12"}`}>
          <SearchHero />

          <div className="mb-4 h-6">
            {isAgentEnabled && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 animate-in fade-in">
                ● Agente Conectado (Texto)
              </span>
            )}
          </div>

          <div className="w-full my-8">
            <QuestionMarquee onQuestionClick={(q) => handleSearch(q, false)} />
            <TopicSelector onSelect={(topic) => handleSearch(topic, true)} className="mt-8" />
          </div>

          <div className="w-full px-4 mb-12">
            <SearchInput onSearch={(q) => handleSearch(q, false)} />
          </div>
        </div>

        {/* Chat */}
        {hasSearched && (
          <div className="container mx-auto px-4 pb-32 flex flex-col space-y-8">
            {messages.map((msg, idx) => (
              <div key={idx} className={`w-full ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                {msg.role === 'user' ? (
                  <div className="bg-gray-100 text-gray-800 px-6 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-lg">
                    {msg.content === 'noticias' ? 'Noticias' :
                      msg.content === 'deportes' ? 'Deportes' :
                        msg.content === 'television' ? 'Televisión' :
                          msg.content === 'radio' ? 'Radio' :
                            msg.content?.charAt(0).toUpperCase() + msg.content!.slice(1)}
                  </div>
                ) : (
                  <ResultsStream
                    isStreaming={!!msg.isStreaming}
                    results={msg.results}
                    directAnswer={msg.directAnswer || msg.content}
                    text={msg.content}
                  />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Sticky Input */}
        {hasSearched && (
          <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 pb-8 z-50">
            <div className="container mx-auto max-w-3xl">
              <SearchInput onSearch={(q) => handleSearch(q, false)} />
            </div>
          </div>
        )}
      </main>

      {!hasSearched && <Footer />}
    </div>
  );
}