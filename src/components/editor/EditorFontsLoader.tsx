"use client";

import { useEffect } from "react";
import {
  buildGoogleFontsCssUrl,
  EDITOR_FONT_CATALOG,
} from "./editor-font-catalog";

const HREF_PREFIX = "greenroom-editor-google-fonts";
const BATCH_SIZE = 12;

/** Loads Google Fonts for the poster editor catalog (batched to avoid URL limits). */
export function EditorFontsLoader() {
  useEffect(() => {
    const googleFonts = EDITOR_FONT_CATALOG.filter((f) => f.googleFamily);
    for (let i = 0; i < googleFonts.length; i += BATCH_SIZE) {
      const id = `${HREF_PREFIX}-${i}`;
      if (document.getElementById(id)) continue;
      const url = buildGoogleFontsCssUrl(googleFonts.slice(i, i + BATCH_SIZE));
      if (!url) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
  }, []);

  return null;
}
