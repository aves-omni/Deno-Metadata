/**
 * Deno Stremio Metadata Addon
 */

import { AddonBuilder, serveHTTP, Args } from "@mkcfdc/stremio-addon-sdk";
import { manifest } from "./manifest.ts";
import {
  handleMetadataRequest,
  handleCatalogSearchRequest,
} from "./handler.ts";

// Create the AddonBuilder
const builder = new AddonBuilder(manifest);

// TODO real catalogs, just an example for now
builder.defineCatalogHandler(async (args: Args) => {
  const { type, id, extra } = args;
  console.log("Catalog request received:", { type, id, extra });

  if (id === "tmdb.search") {
    const searchQuery = extra?.search;
    console.log(searchQuery);
  }

  return await handleCatalogSearchRequest(
    args,
    Deno.env.get("TMDB_API_KEY") || ""
  );
});

builder.defineMetaHandler(async (args: Args) => {
  return await handleMetadataRequest(args, Deno.env.get("TMDB_API_KEY") || "");
});

// Serve over HTTP
const port = parseInt(Deno.env.get("PORT") || "8080");
console.log(`Starting on http://localhost:${port}`);
serveHTTP(builder.getInterface(), { port }).then(({ url }) => {
  console.log(`Manifest available at: ${url}`);
});
