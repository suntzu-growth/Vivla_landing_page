"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
    onSearch?: (query: string) => void;
}

export function SearchInput({ onSearch }: SearchInputProps) {
    const [query, setQuery] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && query.trim()) {
            onSearch?.(query);
            setQuery(""); // Clear input after search
        }
    };

    const handleSearchClick = () => {
        if (query.trim()) {
            onSearch?.(query);
            setQuery(""); // Clear input after search
        }
    }

    return (
        <div className="relative w-full max-w-2xl mx-auto group animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="relative bg-white rounded-full shadow-lg border border-gray-200 flex items-center p-2 hover:shadow-xl transition-shadow duration-300 ring-1 ring-gray-100">
                <Search
                    className="w-5 h-5 text-gray-400 ml-4 cursor-pointer hover:text-red-600 transition-colors"
                    onClick={handleSearchClick}
                />
                <Input
                    type="text"
                    placeholder="Pregunta algo sobre SunTzu..."
                    className="border-none shadow-none focus-visible:ring-0 text-lg py-6 px-4 bg-transparent flex-1 placeholder:text-gray-400"
                    style={{
                        fontFamily: '"Host Grotesk", sans-serif',
                        fontWeight: 300,
                        letterSpacing: '-0.01em'
                    }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
        </div>
    );
}