import { useCallback, useEffect, useReducer, useState } from "react";

/**
 * One paging hook for the community lists (audit 2026-10-30). The four
 * hand-rolled pagers it replaces each had a different bug: another filter's
 * members stapled onto this one (RTK `data` is the last result for ANY arg),
 * a guessed "has more", and Back losing every page past the first.
 *
 * - Reads `currentData` only: it is undefined until THIS arg's answer lands.
 * - `hasMore` is the server's answer (see the caller's `hasMore`).
 * - Loaded pages live in a small in-memory cache keyed by the question, so a
 *   remount (Back from a profile) renders them all at once and the router's
 *   scroll restoration has the height it needs.
 */
export interface PagedQueryResult {
  currentData?: unknown;
  isFetching: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
}

export interface UsePagedListArgs<T, A> {
  /** The question; a new key starts at page 1 (or its cached pages). */
  key: string;
  argFor: (page: number) => A;
  useQuery: (arg: A, opts: { skip?: boolean; refetchOnFocus?: boolean }) => PagedQueryResult;
  items: (data: unknown) => T[];
  hasMore: (data: unknown, page: number) => boolean;
  skip?: boolean;
  refetchOnFocus?: boolean;
}

export interface PagedList<T> {
  items: T[];
  initialLoading: boolean;
  loadingMore: boolean;
  firstPageError?: unknown;
  pageError?: unknown;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

interface Entry {
  pages: unknown[][];
  hasMore: boolean;
  savedAt: number;
}

const MAX_KEYS = 5;
/** Cached pages serve a quick Back; older ones start fresh (they go stale). */
export const PAGED_CACHE_TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, Entry>();

/**
 * The cache key for a list: the viewer plus the FIRST-PAGE QUERY as sent
 * (languages, sort, filters, search), key order ignored. Keying on the
 * filters alone resumed another question's pages after a language change.
 */
export function listCacheKey(viewerId: string, firstPageArg: Record<string, unknown>): string {
  const sorted = Object.keys(firstPageArg)
    .sort()
    .map((k) => [k, firstPageArg[k]]);
  return `${viewerId}|${JSON.stringify(sorted)}`;
}

/** Called when a list is (re)entered: an old entry starts fresh. */
function resumeEntry(key: string): Entry {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.savedAt > PAGED_CACHE_TTL_MS) cache.delete(key);
  return entryFor(key);
}

function entryFor(key: string): Entry {
  let entry = cache.get(key);
  if (!entry) {
    entry = { pages: [], hasMore: true, savedAt: Date.now() };
    cache.set(key, entry);
    while (cache.size > MAX_KEYS) {
      const oldest = cache.keys().next().value as string;
      cache.delete(oldest);
    }
  } else {
    // Most recently used goes last.
    cache.delete(key);
    cache.set(key, entry);
  }
  return entry;
}

/**
 * Drops every cached page. Called after a block / unblock: only the last
 * subscribed page refetches on invalidation, so a blocked member on an
 * earlier cached page would stay on the grid.
 */
export function resetPagedListCache(): void {
  cache.clear();
}

/** Tests only. */
export function pagedListCacheSize(): number {
  return cache.size;
}

/** Tests only. */
export function primePagedListCache(key: string, pages: unknown[][]): void {
  cache.set(key, { pages, hasMore: true, savedAt: Date.now() });
}

const SKIPPED: Entry = { pages: [], hasMore: false, savedAt: 0 };

export function usePagedList<T extends { _id: string }, A>(
  args: UsePagedListArgs<T, A>
): PagedList<T> {
  const { key, argFor, useQuery, items, hasMore, skip, refetchOnFocus } = args;
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // The page we are subscribed to, and the question it belongs to. A new
  // question (or a remount) resumes at its last cached page -- 1 when there
  // is none or the cached pages are older than the TTL. A skipped list
  // (another tab is showing) takes no cache slot.
  const [subscribed, setSubscribed] = useState(() => ({
    key,
    page: skip ? 1 : Math.max(1, resumeEntry(key).pages.length),
  }));
  const current =
    subscribed.key === key
      ? subscribed
      : { key, page: skip ? 1 : Math.max(1, resumeEntry(key).pages.length) };
  if (current !== subscribed) setSubscribed(current);
  const entry = skip ? SKIPPED : entryFor(key);

  const result = useQuery(argFor(current.page), { skip, refetchOnFocus });
  const data = result.currentData;

  useEffect(() => {
    if (data === undefined) return;
    if (skip) return;
    const target = entryFor(key);
    target.pages[current.page - 1] = items(data) as unknown[];
    target.hasMore = hasMore(data, current.page);
    target.savedAt = Date.now();
    rerender();
    // `items`/`hasMore` are pure mappers; the answer is keyed by data + page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key, current.page, skip]);

  const loaded = entry.pages.filter(Boolean).length;
  const canLoadMore = entry.hasMore && loaded >= current.page && !result.isFetching;

  const loadMore = useCallback(() => {
    if (!canLoadMore) return;
    setSubscribed({ key, page: current.page + 1 });
  }, [canLoadMore, key, current.page]);

  const seen = new Set<string>();
  const merged: T[] = [];
  for (const page of entry.pages) {
    for (const row of (page as T[]) || []) {
      if (!seen.has(row._id)) {
        seen.add(row._id);
        merged.push(row);
      }
    }
  }

  const failed = result.isError;
  return {
    items: merged,
    initialLoading: !skip && loaded === 0 && !failed,
    loadingMore: result.isFetching && loaded > 0 && current.page > loaded,
    firstPageError: failed && loaded === 0 ? result.error : undefined,
    pageError: failed && loaded > 0 ? result.error : undefined,
    hasMore: entry.hasMore,
    loadMore,
    retry: result.refetch,
  };
}
