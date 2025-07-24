/**
 * Deno Stremio Metadata Addon
 */

import {
  AddonBuilder,
  serveHTTP,
  MetaPreview,
  Args,
} from "@mkcfdc/stremio-addon-sdk";
import { manifest } from "./manifest.ts";
import { handleMetadataRequest } from "./handler.ts";

// Create the AddonBuilder
const builder = new AddonBuilder(manifest);

// TODO real catalogs, just an example for now
builder.defineCatalogHandler(async (args: Args) => {
  // Config will always be null here as none is defined in the manifest
  const { type, id, extra, config } = args;
  console.log("Catalog request received (No Config Addon):", {
    type,
    id,
    extra,
    config,
  });

  // Use a fixed greeting since there's no config
  const greeting = "Default Greeting";
  console.log(`Using greeting: "${greeting}"`);

  let metas: MetaPreview[] = [];

  // Movie Catalog
  if (type === "movie" && id === "deno-example-catalog-nc") {
    metas = [
      {
        id: "tt0076759",
        type: "movie",
        name: `${greeting}: Star Wars`,
        poster:
          "https://m.media-amazon.com/images/M/MV5BOTA5NjhiOTAtZWM0ZC00MWNhLThiMzEtZDFkOTk2OTU1ZDJkXkEyXkFqcGdeQXVyMTA4NDI1NTQx._V1_SX300.jpg",
      },
      {
        id: "tt1285016",
        type: "movie",
        name: `${greeting}: Social Network`,
        poster:
          "https://m.media-amazon.com/images/M/MV5BOGUyZDUxZjEtMmIzMC00MzlmLTg4MGItZWJmMzBhZjE0Mjc1XkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg",
      },
    ];
  }

  // Series Catalog
  if (type === "series" && id === "deno-example-series-catalog-nc") {
    metas = [
      {
        id: "tt0944947",
        type: "series",
        name: `${greeting}: GoT`,
        poster:
          "https://m.media-amazon.com/images/M/MV5BN2IzYzBiOTQtNGZmMi00NDI5LTgxMzMtN2EzZjA1NjhlOGMxXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg",
      },
    ];
  }

  return Promise.resolve({ metas });
});

builder.defineMetaHandler(async (args: Args) => {
  return await handleMetadataRequest(args);
});

// Serve over HTTP
const port = parseInt(Deno.env.get("PORT") || "8080");
console.log(`Starting on http://localhost:${port}`);
serveHTTP(builder.getInterface(), { port }).then(({ url }) => {
  console.log(`Manifest available at: ${url}`);
});
