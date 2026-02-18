import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../lib/supabaseRepo', () => ({
  signInWithRegisteredUser: vi.fn(),
  signOutRegisteredUser: vi.fn().mockResolvedValue(undefined),
  validateUserAccessKey: vi.fn(),
}));

vi.mock('../../lib/userFavorites', () => ({
  readActiveUser: vi.fn().mockReturnValue(null),
  writeActiveUser: vi.fn(),
  clearActiveUser: vi.fn(),
}));

vi.mock('../../providers/QueryProvider', () => ({
  queryClient: { clear: vi.fn() },
}));

import { signInWithRegisteredUser, validateUserAccessKey } from '../../lib/supabaseRepo';
import { writeActiveUser } from '../../lib/userFavorites';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with no username', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.username).toBeNull();
    expect(result.current.isLoggingIn).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('validates minimum username length', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('a', 'password123');
    });
    expect(result.current.error).toContain('gutxienez 2 karaktere');
    expect(result.current.username).toBeNull();
  });

  it('validates minimum key length', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('usuario', 'ab');
    });
    expect(result.current.error).toContain('gutxienez 3 karaktere');
    expect(result.current.username).toBeNull();
  });

  it('logs in successfully with Supabase auth', async () => {
    vi.mocked(signInWithRegisteredUser).mockResolvedValue({
      ok: true,
      normalizedUsername: 'testuser',
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    expect(result.current.username).toBe('testuser');
    expect(result.current.error).toBeNull();
    expect(writeActiveUser).toHaveBeenCalledWith('testuser');
  });

  it('falls back to key validation when Supabase auth fails', async () => {
    vi.mocked(signInWithRegisteredUser).mockResolvedValue({
      ok: false,
      invalidCredentials: true,
    });
    vi.mocked(validateUserAccessKey).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('s_01', 'mykey123');
    });

    expect(result.current.username).toBe('s_01');
    expect(result.current.error).toBeNull();
  });

  it('shows error when both auth methods fail', async () => {
    vi.mocked(signInWithRegisteredUser).mockResolvedValue({ ok: false });
    vi.mocked(validateUserAccessKey).mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('s_01', 'wrongkey');
    });

    expect(result.current.username).toBeNull();
    expect(result.current.error).toContain('ez dira zuzenak');
  });

  it('clears state on logout', async () => {
    vi.mocked(signInWithRegisteredUser).mockResolvedValue({
      ok: true,
      normalizedUsername: 'testuser',
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('testuser', 'password123');
    });
    expect(result.current.username).toBe('testuser');

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.username).toBeNull();
  });
});
