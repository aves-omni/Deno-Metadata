import { MetaVideo } from "@mkcfdc/stremio-addon-sdk";
import {
  sortByVoteAverageAndCount,
  sortByVoteAverageCountAndAspectRatio,
  sortByAspectRatio,
} from "../utils/sort.ts";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface Video {
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  key: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
  id: string;
}

interface Credit {
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  credit_id: string;
  department: string;
  job: string;
  character: string;
}

function getLanguageCode(locale: string): string {
  return locale.split("-")[0];
}

export async function fetchMovieData(
  apiKey: string,
  id: string,
  preferredLanguage: string
) {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${id}?api_key=${apiKey}&append_to_response=videos,credits,images&language=${preferredLanguage}&include_image_language=${getLanguageCode(
      preferredLanguage
    )}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch movie. Status: ${response.status}`);
  }

  return response.json();
}

export async function fetchSeriesData(
  apiKey: string,
  seriesId: string,
  preferredLanguage: string
) {
  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${seriesId}?api_key=${apiKey}&append_to_response=videos,credits,images,external_ids&language=${preferredLanguage}&include_image_language=${getLanguageCode(
      preferredLanguage
    )}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch series. Status: ${response.status}`);
  }

  return response.json();
}

export async function processTMDBResponse(
  apiKey: string,
  jsonResp: any,
  type: "movie" | "series"
) {
  const logoPath = jsonResp.images.logos[0]?.file_path || jsonResp.title;
  const posterPath = jsonResp.images.posters[0]?.file_path || "";
  const backdropPath =
    sortByAspectRatio(jsonResp.images.backdrops, 1.778)[0]?.file_path || "";

  const trailers = jsonResp.videos?.results
    .filter((video: Video) => video.type === "Trailer")
    .map((video: Video) => ({
      source: video.key,
      type: video.type,
    }));

  const cast = jsonResp.credits.cast
    .filter(
      (member: Credit) =>
        member.known_for_department === "Acting" && member.profile_path
    )
    .map((member: Credit) => ({
      name: member.name,
      character: member.character,
      photo: `https://image.tmdb.org/t/p/w276_and_h350_face${member.profile_path}`,
    }));

  const directors = jsonResp.credits.crew
    .filter((member: Credit) => member.job === "Director")
    .map((director: Credit) => ({
      name: director.name,
      profile: director.profile_path
        ? `https://image.tmdb.org/t/p/w276_and_h350_face${director.profile_path}`
        : null,
    }));

  const writers = jsonResp.credits.crew
    .filter((member: Credit) => member.job === "Writer")
    .map((writer: Credit) => ({
      name: writer.name,
      profile: writer.profile_path
        ? `https://image.tmdb.org/t/p/w276_and_h350_face${writer.profile_path}`
        : null,
    }));

  let videos: MetaVideo[] = [];
  if (type === "series") {
    console.log("Ep", jsonResp.episode_run_time);
    videos = await fetchEpisodes(
      apiKey,
      jsonResp.id,
      jsonResp.external_ids.imdb_id,
      jsonResp.number_of_seasons
    );
  }

  return {
    id: `tmdb:${jsonResp.id}`,
    type: type,
    name: jsonResp.title,
    description: jsonResp.overview,
    poster: `https://image.tmdb.org/t/p/w500${posterPath}`,
    background: `https://image.tmdb.org/t/p/original${backdropPath}`,
    logo: `https://image.tmdb.org/t/p/original${logoPath}`,
    released: new Date(jsonResp.release_date || jsonResp.first_air_date),
    imdbRating: jsonResp.vote_average,
    runtime: parseRunTime(
      jsonResp.runtime ||
        jsonResp.episode_run_time?.[0] ||
        jsonResp.last_episode_to_air?.runtime ||
        jsonResp.next_episode_to_air?.runtime ||
        ""
    ),
    genres: jsonResp.genres.map((genre: any) => genre.name),
    trailers,
    behaviorHints: {
      defaultVideoId: jsonResp.imdb_id
        ? jsonResp.imdb_id
        : `tmdb:${jsonResp.id}`,
      hasScheduledVideos: false,
    },
    country: jsonResp.production_countries
      .map((country: any) => country.iso_3166_1)
      .join(", "),
    director: directors[0]?.name || "",
    writer:
      writers[0]?.name ||
      jsonResp.created_by?.map((writer: any) => writer.name) ||
      "",
    // slug:
    year: (jsonResp.release_date || jsonResp.first_air_date || "").substr(0, 4),
    releaseInfo: (
      jsonResp.release_date ||
      jsonResp.first_air_date ||
      ""
    ).substr(0, 4),
    // links:
    app_extras: {
      cast,
    },
    videos: videos || [],
  };
}

/**
 * Convert runtime in minutes to a formatted string.
 *
 * @param runtime The runtime in minutes.
 * @returns The formatted runtime string.
 */
function parseRunTime(runtime: number): string {
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

/**
 * Convert IMDB ID to TMDB ID for movies or TV series.
 *
 * @param apiKey The user's TMDB API key.
 * @param type "movie" or "tv" to denote the type.
 * @param imdbId The IMDB ID to convert.
 * @returns The TMDB ID or null if not found.
 */
export async function getTmdbID(
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

export async function fetchSearch(params: {
  apiKey: string;
  query: string;
  type: "movie" | "tv";
}) {
  const { apiKey, query, type } = params;
  const url = `${TMDB_BASE_URL}/search/${type}?api_key=${apiKey}&query=${query}&include_adult=false&language=en-US&page=1`;
  const response = await fetch(url);
  console.log("Search:", response);
  if (!response.ok) {
    throw new Error(`Failed to fetch movie. Status: ${response.status}`);
  }

  return response.json();
}

export async function fetchEpisodes(
  apiKey: string,
  seriesId: string,
  imdbId: string,
  numberOfSeasons: number
): Promise<MetaVideo[]> {
  const videoObjects: MetaVideo[] = [];
  const batchSize = 20; // Number of seasons per batch

  for (let i = 0; i < numberOfSeasons; i += batchSize) {
    const end = Math.min(i + batchSize, numberOfSeasons);
    const seasonQueries = Array.from(
      { length: end - i },
      (_, index) => `season/${i + index + 1}`
    ).join(",");

    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${seriesId}?api_key=${apiKey}&append_to_response=${seasonQueries}`
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch data for seasons ${i + 1} to ${end}. Status: ${
          response.status
        }`
      );
      continue;
    }

    const data = await response.json();

    for (let seasonNumber = i + 1; seasonNumber <= end; seasonNumber++) {
      const seasonData = data[`season/${seasonNumber}`];

      for (const episode of seasonData.episodes) {
        const videoObject: MetaVideo = {
          id: `${imdbId}:${seasonNumber}:${episode.episode_number}`,
          name: episode.name,
          season: seasonNumber,
          number: episode.episode_number,
          episode: episode.episode_number,
          released: episode.air_date,
          overview: episode.overview,
          description: episode.overview,
          thumbnail: `https://image.tmdb.org/t/p/w500${episode.still_path}`,
          streams: [], // Populate with actual stream data if available
          firstAired: new Date(episode.air_date).toISOString(),
        };

        videoObjects.push(videoObject);
      }
    }
  }

  return videoObjects;
}

// This function processes batches of up to 20 seasons per API call by appending season data to requests.
