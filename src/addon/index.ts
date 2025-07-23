/**
 * Deno Stremio Metadata Addon
 */

import {
  AddonBuilder,
  serveHTTP,
  MetaDetail,
  MetaPreview,
  Args,
} from "@mkcfdc/stremio-addon-sdk";
import { manifest } from "./manifest.ts";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

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
  const { type, id, config } = args;
  const apiKey = config.apiKey || "";
  const preferredLanguage = config.language || "en"; // Default to English US if not specified
  // TODO configure language in manifest & make sure it's a real language code
  console.log("Meta request received:", { type, id, config });
  const headers = new Headers({
    Accept: "application/json",
  });

  if (!apiKey) {
    console.error("API Key is required for TMDB requests.");
    return { meta: null };
  }

  if (!id) {
    console.error("No ID provided for metadata request.");
    return { meta: null };
  }

  switch (type) {
    case "movie":
      if (id) {
        // TODO fetch session ID and pass as token header instead of passing api key as query parameter
        // TODO use language code in parameter
        const response = await fetch(
          `${TMDB_BASE_URL}/movie/${id}?api_key=${apiKey}&append_to_response=videos,credits,images&language=en-US&include_image_language=${preferredLanguage}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch movie. Status: ${response.status}`);
        }
        const jsonResp = await response.json();
        console.log("Fetched movie data:", jsonResp);

        const logos = jsonResp.images.logos?.sort((a: any, b: any) => {
          // Sort by vote_average first (higher is better)
          if (b.vote_average !== a.vote_average) {
            return b.vote_average - a.vote_average;
          }

          // If vote_average is the same, sort by vote_count (higher is better)
          return b.vote_count - a.vote_count;
        });
        const backdrops = jsonResp.images.backdrops?.sort((a: any, b: any) => {
          // Sort by vote_average first (higher is better)
          if (b.vote_average !== a.vote_average) {
            return b.vote_average - a.vote_average;
          }

          // If vote_average is the same, sort by vote_count (higher is better)
          return b.vote_count - a.vote_count;
        });

        const logoPath = logos[0]?.file_path || jsonResp.title;
        const backdropPath = backdrops[0]?.file_path || "";

        // Format the response for videos
        // TODO
        const videos = jsonResp.videos?.results.map((video: any) => ({
          source: video.key,
          type: video.type,
        }));

        const meta = {
          id: `tmdb:${jsonResp.id}`,
          type: "movie",
          name: jsonResp.title,
          description: jsonResp.overview,
          poster: `https://image.tmdb.org/t/p/w500${jsonResp.poster_path}`,
          background: `https://image.tmdb.org/t/p/original${backdropPath}`,
          logo: `https://image.tmdb.org/t/p/original${logoPath}`,
          released: new Date(jsonResp.release_date),
          imdbRating: jsonResp.vote_average,
          runtime: parseRunTime(jsonResp.runtime),
          // trailers: videos ?? [],
          // trailerStreams: videos ?? [],
          genres: jsonResp.genres.map((genre: any) => genre.name),
          behaviorHints: {
            defaultVideoId: jsonResp.imdb_id
              ? jsonResp.imdb_id
              : `tmdb:${jsonResp.id}`,
            hasScheduledVideos: false,
          },
        };
        return Promise.resolve({ meta });
      }
      break;
    case "series":
      if (id) {
        if (id.startsWith("tt")) {
          // If the seriesId is an IMDB ID, convert it to TMDB ID
          const tmdbID = await getTmdbID(apiKey, "tv", id);
          console.log("Converted TMDB ID:", tmdbID);
          if (!tmdbID) {
            console.error("TMDB ID not found for series:", id);
            return { meta: null };
          }
          args.id = tmdbID;
        }

        const response = await fetch(
          `${TMDB_BASE_URL}/tv/${args.id}?api_key=${apiKey}&append_to_response=videos,credits,images&language=en-US&include_image_language=${preferredLanguage}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch series. Status: ${response.status}`);
        }
        const jsonResp = await response.json();
        console.log("Fetched series data:", jsonResp);

        const logos = jsonResp.images.logos?.sort((a: any, b: any) => {
          // Sort by vote_average first (higher is better)
          if (b.vote_average !== a.vote_average) {
            return b.vote_average - a.vote_average;
          }

          // If vote_average is the same, sort by vote_count (higher is better)
          return b.vote_count - a.vote_count;
        });
        const backdrops = jsonResp.images.backdrops?.sort((a: any, b: any) => {
          // Sort by vote_average first (higher is better)
          if (b.vote_average !== a.vote_average) {
            return b.vote_average - a.vote_average;
          }

          // If vote_average is the same, sort by vote_count (higher is better)
          return b.vote_count - a.vote_count;
        });

        const logoPath = logos[0]?.file_path || jsonResp.title;
        const backdropPath = backdrops[0]?.file_path || "";

        const meta = {
          id: `tmdb:${jsonResp.id}`,
          type: "series",
          name: jsonResp.title,
          description: jsonResp.overview,
          poster: `https://image.tmdb.org/t/p/w500${jsonResp.poster_path}`,
          background: `https://image.tmdb.org/t/p/original${backdropPath}`,
          logo: `https://image.tmdb.org/t/p/original${logoPath}`,
          released: new Date(jsonResp.release_date),
          imdbRating: jsonResp.vote_average,
          runtime: parseRunTime(jsonResp.runtime),
          // trailers: videos ?? [],
          // trailerStreams: videos ?? [],
          genres: jsonResp.genres.map((genre: any) => genre.name),
          behaviorHints: {
            defaultVideoId: jsonResp.imdb_id
              ? jsonResp.imdb_id
              : `tmdb:${jsonResp.id}`,
            hasScheduledVideos: false,
          },
        };
        return Promise.resolve({ meta });
      }
      break;
    default:
      console.warn(`Unknown type: ${args.type}`);
      break;
  }

  return Promise.resolve({ meta: undefined });
});

// Serve over HTTP
const port = parseInt(Deno.env.get("PORT") || "8080");
console.log(`Starting on http://localhost:${port}`);
serveHTTP(builder.getInterface(), { port }).then(({ url }) => {
  console.log(`Manifest available at: ${url}`);
});

/**
 * Convert IMDB ID to TMDB ID for movies or TV series.
 *
 * @param apiKey The user's TMDB API key.
 * @param type "movie" or "tv" to denote the type.
 * @param imdbId The IMDB ID to convert.
 * @returns The TMDB ID or null if not found.
 */
async function getTmdbID(
  apiKey: string,
  type: "movie" | "tv",
  imdbId: string
): Promise<string | null> {
  const url = `${TMDB_BASE_URL}/find/${imdbId}?external_source=imdb_id&api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (type === "movie") {
      return data.movie_results && data.movie_results[0]
        ? data.movie_results[0].id
        : null;
    } else {
      return data.tv_results && data.tv_results[0]
        ? data.tv_results[0].id
        : null;
    }
  } catch (error) {
    console.error("Error fetching TMDB ID:", error);
    return null;
  }
}

/**
 * Convert runtime in minutes to a formatted string.
 *
 * @param runtime The runtime in minutes.
 * @returns The formatted runtime string.
 */
function parseRunTime(runtime: any): string {
  if (!runtime) {
    return "";
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours > 0) {
    return `${hours}h${minutes}min`;
  }

  return `${minutes}min`;
}
