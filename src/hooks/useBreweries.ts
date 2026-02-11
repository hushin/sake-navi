import useSWR from 'swr';
import { getBreweries, type BreweryWithRating } from '@/lib/api';
import { SWR_KEYS } from '@/lib/swrKeys';

const THREE_MINUTES = 3 * 60 * 1000;

export function useBreweries() {
  const { data, error, isLoading, mutate } = useSWR<BreweryWithRating[]>(
    SWR_KEYS.breweries,
    () => getBreweries(),
    {
      dedupingInterval: THREE_MINUTES,
    },
  );

  return {
    breweries: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
