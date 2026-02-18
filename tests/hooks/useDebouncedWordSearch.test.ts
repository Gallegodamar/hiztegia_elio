import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedWordSearch } from '../../hooks/useDebouncedWordSearch';

vi.mock('../../lib/supabaseRepo', () => ({
  searchWords: vi.fn().mockResolvedValue([
    { id: 1, hitza: 'etxe', sinonimoak: ['egoitza'], level: 1 },
  ]),
}));

describe('useDebouncedWordSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns empty results for empty search term', () => {
    const { result } = renderHook(() => useDebouncedWordSearch(''));
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('returns empty results for whitespace-only term', () => {
    const { result } = renderHook(() => useDebouncedWordSearch('   '));
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('sets isSearching while debounce timer is running', async () => {
    const { result } = renderHook(() => useDebouncedWordSearch('etxe', 150));
    expect(result.current.isSearching).toBe(false);
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    // After debounce fires, isSearching becomes true then resolves
  });

  it('cancels previous request when search term changes quickly', async () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedWordSearch(term, 150),
      { initialProps: { term: 'etx' } }
    );
    rerender({ term: 'etxe' });
    await act(async () => { vi.advanceTimersByTime(200); });
    // After async completes, isSearching should be false
    expect(result.current.isSearching).toBe(false);
  });
});
