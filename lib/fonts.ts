import {
  Inter, Playfair_Display, Roboto, Oswald, Lobster, Bebas_Neue, Pacifico,
  Montserrat, Poppins, Dancing_Script, Anton, Caveat, Great_Vibes,
  Merriweather, Abril_Fatface, Indie_Flower, Space_Mono, Cormorant_Garamond,
  Bangers, Permanent_Marker,
} from "next/font/google";

// Previously post.font_family was applied as a raw inline `fontFamily` CSS
// string (e.g. "Poppins, sans-serif"). That name never matched any font
// actually loaded on the page, so every non-default font silently fell back
// to the browser's generic sans-serif. next/font self-hosts each font at
// build time and gives us a real className to apply instead.

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const lobster = Lobster({ subsets: ["latin"], weight: "400" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const anton = Anton({ subsets: ["latin"], weight: "400" });
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400" });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"] });
const abrilFatface = Abril_Fatface({ subsets: ["latin"], weight: "400" });
const indieFlower = Indie_Flower({ subsets: ["latin"], weight: "400" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"] });
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const bangers = Bangers({ subsets: ["latin"], weight: "400" });
const permanentMarker = Permanent_Marker({ subsets: ["latin"], weight: "400" });

export const FONT_OPTIONS = [
  "Inter", "Playfair Display", "Roboto", "Oswald", "Lobster", "Bebas Neue",
  "Pacifico", "Montserrat", "Poppins", "Dancing Script", "Anton", "Caveat",
  "Great Vibes", "Merriweather", "Abril Fatface", "Indie Flower", "Space Mono",
  "Cormorant Garamond", "Bangers", "Permanent Marker",
] as const;

const FONT_CLASS_MAP: Record<string, string> = {
  "Inter": inter.className,
  "Playfair Display": playfairDisplay.className,
  "Roboto": roboto.className,
  "Oswald": oswald.className,
  "Lobster": lobster.className,
  "Bebas Neue": bebasNeue.className,
  "Pacifico": pacifico.className,
  "Montserrat": montserrat.className,
  "Poppins": poppins.className,
  "Dancing Script": dancingScript.className,
  "Anton": anton.className,
  "Caveat": caveat.className,
  "Great Vibes": greatVibes.className,
  "Merriweather": merriweather.className,
  "Abril Fatface": abrilFatface.className,
  "Indie Flower": indieFlower.className,
  "Space Mono": spaceMono.className,
  "Cormorant Garamond": cormorantGaramond.className,
  "Bangers": bangers.className,
  "Permanent Marker": permanentMarker.className,
};

export function getFontClassName(name?: string | null): string {
  return FONT_CLASS_MAP[name || "Inter"] || FONT_CLASS_MAP["Inter"];
}
