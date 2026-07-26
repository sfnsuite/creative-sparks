import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getVerifiedAdmin } from "@/lib/admin-auth";

/**
 * Admin-only gate. Deny by default: requires a valid session AND the 'admin'
 * role verified against public.user_roles via the has_role RPC. Unauthorized
 * visitors are redirected to /auth (history replace) BEFORE any child data
 * loads. RLS remains the final authority.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const admin = await getVerifiedAdmin();
    if (!admin) {
      throw redirect({ to: "/auth", replace: true });
    }
    return { userId: admin.id, email: admin.email };
  },
  component: () => <Outlet />,
});
