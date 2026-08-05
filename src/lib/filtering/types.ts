/**
 * Shared faceted filtering engine (BP-024G).
 * Filters are independent, data-driven definitions — not hard-coded switches.
 */

export type FilterDefinition<T> = {
  id: string;
  label: string;
  category: string;
  predicate: (item: T) => boolean;
};
