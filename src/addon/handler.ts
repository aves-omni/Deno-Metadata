import { MetaDetail, Args } from "@mkcfdc/stremio-addon-sdk";

import {
  fetchMovieData,
  fetchSeriesData,
  processTMDBResponse,
  getTmdbID,
} from "../apis/tmdb.ts";

export async function handleMetadataRequest(
  args: Args
): Promise<{ meta: MetaDetail | null }> {
  const { type, id } = args;
  const config = args.config || {};
  const apiKey = config?.apiKeyTMDB || Deno.env.get("TMDB_API_KEY") || "";
  const preferredLanguage = config?.preferredLanguage || "en-US";
  console.log("Meta request received:", { type, id, config });

  if (!apiKey) {
    console.error("API Key is required for TMDB requests.");
    return Promise.resolve({ meta: null });
  }

  if (!id) {
    console.error("No ID provided for metadata request.");
    return Promise.resolve({ meta: null });
  }

  // Fetch movie or series data from TMDB
  let data;
  switch (type) {
    case "movie":
      data = await fetchMovieData(apiKey, id, preferredLanguage);
      // TODO data processing for movies
      break;
    case "series":
      if (id.startsWith("tt")) {
        // If the seriesId is an IMDB ID, convert it to TMDB ID
        const tmdbID = await getTmdbID(apiKey, "tv", id);
        console.log("Converted TMDB ID:", tmdbID);
        if (!tmdbID) {
          console.error("TMDB ID not found for series:", id);
          return { meta: null };
        }
        data = await fetchSeriesData(apiKey, tmdbID, preferredLanguage);
      } else {
        data = await fetchSeriesData(apiKey, id, preferredLanguage);
      }
      break;
    default:
      console.warn(`Unknown type: ${type}`);
      return Promise.resolve({ meta: null });
  }

  if (!data) {
    console.error(`No data found for ${type} with ID: ${id}`);
    return Promise.resolve({ meta: null });
  }
  data = await processTMDBResponse(apiKey, data, type);

  return Promise.resolve({ meta: data as MetaDetail });
}
