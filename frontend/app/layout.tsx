import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TransformAI — Content Transformation Platform",
  description: "Agentic multimodal content transformation workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
