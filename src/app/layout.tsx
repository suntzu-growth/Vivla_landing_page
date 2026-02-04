import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";

// Lora font (elegant serif similar to Teodor)
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Suntzu: Realestate AI Assistant",
  description: "Tu asistente de IA para encontrar la casa ideal con Suntzu Realestate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lora.variable} antialiased`}
        style={{ fontFamily: 'var(--font-lora), serif' }}
      >
        {children}
      </body>
    </html>
  );
}
