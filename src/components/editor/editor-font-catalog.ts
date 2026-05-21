/** Google Fonts catalog for the poster editor (loaded in editor layout). */

export type FontCategory =
  | "trending"
  | "popular"
  | "display"
  | "serif"
  | "sans"
  | "script"
  | "unique";

export interface EditorFontEntry {
  id: string;
  label: string;
  /** CSS font-family value */
  family: string;
  /** Google Fonts family query name */
  googleFamily: string;
  categories: FontCategory[];
  tags: string[];
  weights?: string;
}

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  trending: "Trending",
  popular: "Popular",
  display: "Display",
  serif: "Serif",
  sans: "Sans",
  script: "Script",
  unique: "Unique",
};

export const EDITOR_FONT_CATALOG: EditorFontEntry[] = [
  {
    id: "outfit",
    label: "Outfit",
    family: "Outfit, system-ui, sans-serif",
    googleFamily: "Outfit",
    categories: ["trending", "popular", "sans"],
    tags: ["modern", "clean", "geometric"],
    weights: "400;500;600;700",
  },
  {
    id: "inter",
    label: "Inter",
    family: '"Inter", system-ui, sans-serif',
    googleFamily: "Inter",
    categories: ["trending", "popular", "sans"],
    tags: ["ui", "neutral", "readable"],
    weights: "400;600;700",
  },
  {
    id: "poppins",
    label: "Poppins",
    family: '"Poppins", system-ui, sans-serif',
    googleFamily: "Poppins",
    categories: ["trending", "popular", "sans"],
    tags: ["friendly", "round"],
    weights: "400;600;700",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: '"Montserrat", system-ui, sans-serif',
    googleFamily: "Montserrat",
    categories: ["trending", "popular", "sans"],
    tags: ["poster", "bold"],
    weights: "400;600;700",
  },
  {
    id: "open-sans",
    label: "Open Sans",
    family: '"Open Sans", system-ui, sans-serif',
    googleFamily: "Open+Sans",
    categories: ["popular", "sans"],
    tags: ["classic", "web"],
    weights: "400;600;700",
  },
  {
    id: "roboto",
    label: "Roboto",
    family: '"Roboto", system-ui, sans-serif',
    googleFamily: "Roboto",
    categories: ["popular", "sans"],
    tags: ["google", "neutral"],
    weights: "400;500;700",
  },
  {
    id: "lato",
    label: "Lato",
    family: '"Lato", system-ui, sans-serif',
    googleFamily: "Lato",
    categories: ["popular", "sans"],
    tags: ["warm", "humanist"],
    weights: "400;700",
  },
  {
    id: "raleway",
    label: "Raleway",
    family: '"Raleway", system-ui, sans-serif',
    googleFamily: "Raleway",
    categories: ["popular", "sans"],
    tags: ["thin", "elegant", "light"],
    weights: "300;400;600;700",
  },
  {
    id: "nunito",
    label: "Nunito",
    family: '"Nunito", system-ui, sans-serif',
    googleFamily: "Nunito",
    categories: ["popular", "sans"],
    tags: ["soft", "rounded"],
    weights: "400;700",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    family: '"DM Sans", system-ui, sans-serif',
    googleFamily: "DM+Sans",
    categories: ["trending", "sans"],
    tags: ["minimal", "geometric"],
    weights: "400;500;700",
  },
  {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    family: '"Plus Jakarta Sans", system-ui, sans-serif',
    googleFamily: "Plus+Jakarta+Sans",
    categories: ["trending", "sans"],
    tags: ["startup", "modern"],
    weights: "400;600;700",
  },
  {
    id: "oswald",
    label: "Oswald",
    family: '"Oswald", system-ui, sans-serif',
    googleFamily: "Oswald",
    categories: ["display", "popular"],
    tags: ["condensed", "headline", "narrow"],
    weights: "400;600;700",
  },
  {
    id: "bebas-neue",
    label: "Bebas Neue",
    family: '"Bebas Neue", system-ui, sans-serif',
    googleFamily: "Bebas+Neue",
    categories: ["display", "trending", "unique"],
    tags: ["poster", "impact", "caps"],
    weights: "400",
  },
  {
    id: "anton",
    label: "Anton",
    family: '"Anton", system-ui, sans-serif',
    googleFamily: "Anton",
    categories: ["display", "unique"],
    tags: ["bold", "poster", "wide"],
    weights: "400",
  },
  {
    id: "archivo-black",
    label: "Archivo Black",
    family: '"Archivo Black", system-ui, sans-serif',
    googleFamily: "Archivo+Black",
    categories: ["display", "unique"],
    tags: ["heavy", "headline"],
    weights: "400",
  },
  {
    id: "orbitron",
    label: "Orbitron",
    family: '"Orbitron", system-ui, sans-serif',
    googleFamily: "Orbitron",
    categories: ["display", "unique", "trending"],
    tags: ["futuristic", "sci-fi", "tech"],
    weights: "400;700",
  },
  {
    id: "rajdhani",
    label: "Rajdhani",
    family: '"Rajdhani", system-ui, sans-serif',
    googleFamily: "Rajdhani",
    categories: ["display", "unique"],
    tags: ["futuristic", "narrow"],
    weights: "400;600;700",
  },
  {
    id: "bangers",
    label: "Bangers",
    family: '"Bangers", system-ui, cursive',
    googleFamily: "Bangers",
    categories: ["display", "unique"],
    tags: ["cartoon", "comic", "fun"],
    weights: "400",
  },
  {
    id: "bungee",
    label: "Bungee",
    family: '"Bungee", system-ui, sans-serif',
    googleFamily: "Bungee",
    categories: ["display", "unique"],
    tags: ["urban", "bold"],
    weights: "400",
  },
  {
    id: "righteous",
    label: "Righteous",
    family: '"Righteous", system-ui, sans-serif',
    googleFamily: "Righteous",
    categories: ["display", "unique"],
    tags: ["retro", "rounded"],
    weights: "400",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    family: '"Playfair Display", Georgia, serif',
    googleFamily: "Playfair+Display",
    categories: ["serif", "trending", "popular"],
    tags: ["elegant", "editorial", "luxury"],
    weights: "400;700",
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville",
    family: '"Libre Baskerville", Georgia, serif',
    googleFamily: "Libre+Baskerville",
    categories: ["serif", "popular"],
    tags: ["classic", "readable"],
    weights: "400;700",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    family: '"Merriweather", Georgia, serif',
    googleFamily: "Merriweather",
    categories: ["serif", "popular"],
    tags: ["book", "warm"],
    weights: "400;700",
  },
  {
    id: "lora",
    label: "Lora",
    family: '"Lora", Georgia, serif',
    googleFamily: "Lora",
    categories: ["serif"],
    tags: ["calligraphy", "soft"],
    weights: "400;700",
  },
  {
    id: "eb-garamond",
    label: "EB Garamond",
    family: '"EB Garamond", Georgia, serif',
    googleFamily: "EB+Garamond",
    categories: ["serif", "unique"],
    tags: ["classic", "formal"],
    weights: "400;700",
  },
  {
    id: "fraunces",
    label: "Fraunces",
    family: '"Fraunces", Georgia, serif',
    googleFamily: "Fraunces",
    categories: ["serif", "unique", "trending"],
    tags: ["quirky", "display"],
    weights: "400;700",
  },
  {
    id: "dancing-script",
    label: "Dancing Script",
    family: '"Dancing Script", cursive',
    googleFamily: "Dancing+Script",
    categories: ["script", "trending", "popular"],
    tags: ["handwriting", "casual"],
    weights: "400;700",
  },
  {
    id: "great-vibes",
    label: "Great Vibes",
    family: '"Great Vibes", cursive',
    googleFamily: "Great+Vibes",
    categories: ["script", "unique"],
    tags: ["calligraphy", "elegant"],
    weights: "400",
  },
  {
    id: "pacifico",
    label: "Pacifico",
    family: '"Pacifico", cursive',
    googleFamily: "Pacifico",
    categories: ["script", "popular"],
    tags: ["retro", "surf"],
    weights: "400",
  },
  {
    id: "lobster",
    label: "Lobster",
    family: '"Lobster", cursive',
    googleFamily: "Lobster",
    categories: ["script", "display"],
    tags: ["bold", "fun"],
    weights: "400",
  },
  {
    id: "caveat",
    label: "Caveat",
    family: '"Caveat", cursive',
    googleFamily: "Caveat",
    categories: ["script", "unique"],
    tags: ["handwritten", "marker"],
    weights: "400;700",
  },
  {
    id: "satisfy",
    label: "Satisfy",
    family: '"Satisfy", cursive',
    googleFamily: "Satisfy",
    categories: ["script"],
    tags: ["brush", "casual"],
    weights: "400",
  },
  {
    id: "permanent-marker",
    label: "Permanent Marker",
    family: '"Permanent Marker", cursive',
    googleFamily: "Permanent+Marker",
    categories: ["script", "unique", "display"],
    tags: ["marker", "informal"],
    weights: "400",
  },
  {
    id: "work-sans",
    label: "Work Sans",
    family: '"Work Sans", system-ui, sans-serif',
    googleFamily: "Work+Sans",
    categories: ["sans", "popular"],
    tags: ["professional"],
    weights: "400;600;700",
  },
  {
    id: "quicksand",
    label: "Quicksand",
    family: '"Quicksand", system-ui, sans-serif',
    googleFamily: "Quicksand",
    categories: ["sans", "trending"],
    tags: ["round", "friendly", "light"],
    weights: "300;400;600;700",
  },
  {
    id: "jost",
    label: "Jost",
    family: '"Jost", system-ui, sans-serif',
    googleFamily: "Jost",
    categories: ["sans", "trending"],
    tags: ["geometric", "thin"],
    weights: "300;400;600;700",
  },
  {
    id: "rubik",
    label: "Rubik",
    family: '"Rubik", system-ui, sans-serif',
    googleFamily: "Rubik",
    categories: ["sans", "popular"],
    tags: ["rounded", "modern"],
    weights: "400;600;700",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    family: '"Space Grotesk", system-ui, sans-serif',
    googleFamily: "Space+Grotesk",
    categories: ["sans", "unique", "trending"],
    tags: ["tech", "futuristic"],
    weights: "400;600;700",
  },
  {
    id: "georgia",
    label: "Georgia",
    family: "Georgia, serif",
    googleFamily: "",
    categories: ["serif", "popular"],
    tags: ["system", "classic"],
  },
  {
    id: "arial",
    label: "Arial",
    family: "Arial, sans-serif",
    googleFamily: "",
    categories: ["sans", "popular"],
    tags: ["system"],
  },
  {
    id: "times",
    label: "Times New Roman",
    family: '"Times New Roman", Times, serif',
    googleFamily: "",
    categories: ["serif", "popular"],
    tags: ["system", "formal"],
  },
];

/** Flat list for toolbar dropdowns (backward compatible shape). */
export const BUILTIN_FONTS = EDITOR_FONT_CATALOG.map((f) => ({
  label: f.label,
  value: f.family,
}));

export function buildGoogleFontsCssUrl(fonts: EditorFontEntry[]): string {
  const families = fonts
    .filter((f) => f.googleFamily)
    .map((f) => {
      const w = f.weights ?? "400;700";
      return `family=${f.googleFamily}:wght@${w}`;
    });
  if (families.length === 0) return "";
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

export function fontsForCategory(
  category: FontCategory | "all",
): EditorFontEntry[] {
  if (category === "all") return EDITOR_FONT_CATALOG;
  return EDITOR_FONT_CATALOG.filter((f) => f.categories.includes(category));
}

export function filterFonts(query: string, category: FontCategory | "all") {
  const q = query.trim().toLowerCase();
  let list = fontsForCategory(category);
  if (!q) return list;
  return list.filter(
    (f) =>
      f.label.toLowerCase().includes(q) ||
      f.tags.some((t) => t.includes(q)) ||
      f.categories.some((c) => c.includes(q)),
  );
}

/** Fonts used on text layers in the current document. */
export function documentFontsFromElements(
  elements: { type: string; fontFamily?: string }[],
): EditorFontEntry[] {
  const used = new Set<string>();
  for (const el of elements) {
    if (el.type === "text" && el.fontFamily) used.add(el.fontFamily);
  }
  const matched: EditorFontEntry[] = [];
  for (const family of used) {
    const entry =
      EDITOR_FONT_CATALOG.find((f) => f.family === family) ??
      ({
        id: `custom-${family}`,
        label: family.split(",")[0]?.replace(/['"]/g, "").trim() ?? "Font",
        family,
        googleFamily: "",
        categories: ["popular"] as FontCategory[],
        tags: [],
      } satisfies EditorFontEntry);
    matched.push(entry);
  }
  return matched;
}
