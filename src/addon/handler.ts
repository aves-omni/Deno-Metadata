import { MetaDetail, Args, MetaPreview } from "@mkcfdc/stremio-addon-sdk";

import {
  fetchMovieData,
  fetchSeriesData,
  fetchSearch,
  processTMDBResponse,
  getTmdbID,
} from "../apis/tmdb.ts";

export async function handleCatalogSearchRequest(
    args: Args,
  env: string
): Promise<{ meta: MetaPreview[] | null }> {
  let metas: MetaPreview[] = [];
  return Promise.resolve({ meta: metas });
}

export async function handleMetadataRequest(
  args: Args,
  env: string
): Promise<{ meta: MetaDetail | null }> {
  const { type, id } = args;
  const config = args.config || {};
  const apiKey = config?.apiKeyTMDB || env;

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
      data = await fetchMovieData(String(apiKey), id, String(preferredLanguage));
      // TODO data processing for movies
      break;
    case "series":
      if (id.startsWith("tt")) {
        // If the seriesId is an IMDB ID, convert it to TMDB ID
        const tmdbID = await getTmdbID(String(apiKey), "tv", id);
        console.log("Converted TMDB ID:", tmdbID);
        if (!tmdbID) {
          console.error("TMDB ID not found for series:", id);
          return { meta: null };
        }
        data = await fetchSeriesData(String(apiKey), tmdbID, String(preferredLanguage));
      } else {
        data = await fetchSeriesData(String(apiKey), id, String(preferredLanguage));
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
  data = await processTMDBResponse(String(apiKey), data, type);

  return Promise.resolve({ meta: data as MetaDetail });
}
