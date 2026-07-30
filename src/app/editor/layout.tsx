import { Libre_Baskerville, Outfit } from "next/font/google";
import { EditorFontsLoader } from "@/components/editor/EditorFontsLoader";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre",
});

/** Full-screen editor — loads poster design fonts */
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`h-dvh overflow-hidden ${outfit.variable} ${libre.variable}`}
    >
      <EditorFontsLoader />
      {children}
    </div>
  );
}
