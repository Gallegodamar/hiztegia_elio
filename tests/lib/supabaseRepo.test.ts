import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client before importing repo
vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc: vi.fn() as any,
    from: vi.fn(),
  },
  supabasePublic: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { validateUserAccessKey, signOutRegisteredUser } from '../../lib/supabaseRepo';
import { supabase } from '../../supabase';

// Helper to build a minimal Supabase-like response
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpcResponse = (data: any, error: any = null) =>
  Promise.resolve({ data, error, count: null, status: 200, statusText: 'OK' });

describe('supabaseRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateUserAccessKey', () => {
    it('returns ok:true when RPC succeeds', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any).mockReturnValue(rpcResponse(true));

      const result = await validateUserAccessKey('s_01', 'mykey');
      expect(result.ok).toBe(true);
    });

    it('returns ok:false when RPC returns false', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any).mockReturnValue(rpcResponse(false));

      const result = await validateUserAccessKey('s_01', 'wrongkey');
      expect(result.ok).toBe(false);
    });

    it('returns missingValidationFunction:true when function does not exist', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any).mockReturnValue(
        rpcResponse(null, { code: 'PGRST202', message: 'function validate_user_key(text, text) does not exist', details: '', hint: '', name: 'PostgrestError' })
      );

      const result = await validateUserAccessKey('s_01', 'mykey');
      expect(result.ok).toBe(false);
      expect(result.missingValidationFunction).toBe(true);
    });
  });

  describe('signOutRegisteredUser', () => {
    it('calls supabase signOut', async () => {
      await signOutRegisteredUser();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
