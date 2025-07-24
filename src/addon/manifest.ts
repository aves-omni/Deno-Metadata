import type { Manifest } from "@mkcfdc/stremio-addon-sdk";
import { config } from "https://deno.land/x/dotenv/mod.ts";

config(); // Load all .env variables

// Read version from deno.json
let version = "1.0.0";
try {
  const denoConfig = JSON.parse(
    Deno.readTextFileSync(new URL("../../deno.json", import.meta.url))
  );
  if (denoConfig.version) version = denoConfig.version;
} catch (error) {
  console.error("Failed to read or parse deno.json:", error);
}

export const manifest: Manifest = {
  id: Deno.env.get("STREMIO_ADDON_ID") || "org.stremio.deno-metadata-addon",
  version: version,
  name: Deno.env.get("STREMIO_ADDON_NAME") || "Deno Metadata Addon",
  description:
    Deno.env.get("STREMIO_ADDON_DESCRIPTION") ||
    "A Stremio metadata addon using TMDB API.",
  resources: ["meta", "catalog"],
  types: ["movie", "series"],
  config: [
    {
      key: "apiKeyTMDB",
      type: "text",
      title: "TMDB API Key",
      required: true,
    },
    {
      key: "preferredLanguage",
      type: "select",
      title: "Preferred Language",
      required: true,
      options: ["en-US", "es-ES", "fr-FR"],
    },
  ],
  idPrefixes: ["tmdb:", "tt"],
  encryptionSecret: Deno.env.get("JWT_SECRET"),
  behaviorHints: {
    configurable: true,
    configurationRequired: false,
  },
  catalogs: [
    {
      id: "deno.search",
      type: "movie",
      name: `TMDB | Search`,
      extra: [{ name: "search", isRequired: true, options: [] }],
    },
    {
      id: "deno.search",
      type: "series",
      name: `TMDB | Search`,
      extra: [{ name: "search", isRequired: true, options: [] }],
    },
  ],
};
