export function sortByVoteAverageAndCount(array: any[]) {
  return array?.sort((a: any, b: any) => {
    if (b.vote_average !== a.vote_average) {
      return b.vote_average - a.vote_average;
    }
    return b.vote_count - a.vote_count;
  });
}

export function sortByVoteAverageCountAndAspectRatio(
  array: any[],
  preferredAspectRatio: number
) {
  return array?.sort((a: any, b: any) => {
    if (
      Math.abs(b.aspect_ratio - preferredAspectRatio) !==
      Math.abs(a.aspect_ratio - preferredAspectRatio)
    ) {
      return (
        Math.abs(a.aspect_ratio - preferredAspectRatio) -
        Math.abs(b.aspect_ratio - preferredAspectRatio)
      );
    }
    if (b.vote_average !== a.vote_average) {
      return b.vote_average - a.vote_average;
    }
    return b.vote_count - a.vote_count;
  });
}
export function sortByAspectRatio(array: any[], preferredAspectRatio: number) {
  return array?.sort((a: any, b: any) => {
    return (
      Math.abs(a.aspect_ratio - preferredAspectRatio) -
      Math.abs(b.aspect_ratio - preferredAspectRatio)
    );
  });
}
