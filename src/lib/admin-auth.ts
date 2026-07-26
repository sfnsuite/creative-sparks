import { supabase } from "@/integrations/supabase/client";

/**
 * Deny-by-default admin verification.
 *
 * Requires BOTH a valid Supabase session AND a matching row in
 * public.user_roles with role = 'admin' (checked via the SECURITY DEFINER
 * `has_role` RPC that verifies auth.uid() = _user_id).
 *
 * A session alone is NEVER admin authorization. On any failure the user is
 * signed out to avoid leaving a half-authorized state around.
 */
export async function getVerifiedAdmin(): Promise<{
  id: string;
  email: string | null;
} | null> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) return null;

  const user = userRes.user;
  const { data: isAdmin, error: rpcErr } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (rpcErr || isAdmin !== true) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    return null;
  }

  return { id: user.id, email: user.email ?? null };
}
