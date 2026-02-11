export const SWR_KEYS = {
  bookmarks: '/api/bookmarks',
  breweries: '/api/breweries',
  breweryDetail: (id: number) => `/api/breweries/${id}`,
  breweryNotes: (id: number) => `/api/breweries/${id}/notes`,
  timeline: '/api/timeline',
} as const;
