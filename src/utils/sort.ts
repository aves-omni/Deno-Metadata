// Type definitions
type VotableItem = {
  vote_average: number;
  vote_count: number;
};

type AspectRatioItem = {
  aspect_ratio: number;
};

type MediaItem = VotableItem & AspectRatioItem;

// Helper functions
const compareVotes = (a: VotableItem, b: VotableItem): number => {
  if (b.vote_average !== a.vote_average) {
    return b.vote_average - a.vote_average;
  }
  return b.vote_count - a.vote_count;
};

const compareAspectRatio = (a: AspectRatioItem, b: AspectRatioItem, preferred: number): number => {
  return Math.abs(a.aspect_ratio - preferred) - Math.abs(b.aspect_ratio - preferred);
};

// Exported sorting functions
export const sortByVoteAverageAndCount = <T extends VotableItem>(array: T[]): T[] => {
  return array?.sort(compareVotes) ?? [];
};

export const sortByAspectRatio = <T extends AspectRatioItem>(array: T[], preferredAspectRatio: number): T[] => {
  return array?.sort((a, b) => compareAspectRatio(a, b, preferredAspectRatio)) ?? [];
};

export const sortByVoteAverageCountAndAspectRatio = <T extends MediaItem>(
  array: T[],
  preferredAspectRatio: number
): T[] => {
  return array?.sort((a, b) => {
    const aspectDiff = compareAspectRatio(a, b, preferredAspectRatio);
    return aspectDiff !== 0 ? aspectDiff : compareVotes(a, b);
  }) ?? [];
};
