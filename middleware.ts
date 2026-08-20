import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// The actual admin page still lives at app/(public)/admin in the codebase —
// renaming that folder isn't necessary. Instead, set NEXT_PUBLIC_ADMIN_PATH
// in your hosting provider's environment variables (never commit it to
// git) to whatever URL segment you want to use instead of "/admin". Once
// set, the literal "/admin" path stops resolving to anything at all, and
// requests to your custom path get transparently served the real admin
// page. If the env var is unset, "/admin" keeps working as before.
//
// Worth knowing: this only reduces how easy the URL is to stumble onto or
// guess automatically — it is NOT the actual security boundary. That's
// still the auth check below, which blocks unauthenticated access
// regardless of whether someone knows the exact path.
const ADMIN_PATH = (process.env.NEXT_PUBLIC_ADMIN_PATH || "admin").replace(/^\/+|\/+$/g, "");
const USING_CUSTOM_PATH = ADMIN_PATH !== "admin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Once a custom path is configured, the literal /admin path should not
  // resolve to anything — not even a redirect to /login, which would
  // itself confirm something lives there. A plain 404 gives nothing away.
  if (USING_CUSTOM_PATH && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const isAdminRequest = pathname === `/${ADMIN_PATH}` || pathname.startsWith(`/${ADMIN_PATH}/`);
  if (!isAdminRequest) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Serve the real /admin page files under the custom URL without ever
  // exposing the literal "/admin" path in the browser.
  if (USING_CUSTOM_PATH) {
    const rewrittenPath = pathname.replace(`/${ADMIN_PATH}`, "/admin");
    return NextResponse.rewrite(new URL(rewrittenPath, request.url));
  }

  return response;
}

export const config = {
  // Broad match is required since the custom admin path is only known at
  // runtime (via env var), not at build time. The check inside the
  // function above is a cheap string comparison for every non-admin
  // request, so this has no real performance cost.
  matcher: ["/((?!_next/|api/|.*\\.).*)"],
};
