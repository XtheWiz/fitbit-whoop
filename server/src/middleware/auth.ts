import { Elysia } from "elysia";

/**
 * Bearer-token guard. When API_TOKEN is set, every route except /health requires
 * `Authorization: Bearer <API_TOKEN>`. No-op when API_TOKEN is unset (local dev).
 * Protects the publicly-tunneled API on the shared server.
 */
export const auth = new Elysia({ name: "auth" }).onBeforeHandle(
  { as: "global" },
  ({ request, path, set }) => {
    const token = process.env.API_TOKEN;
    if (!token) return; // open in local dev
    if (path === "/health") return; // tunnel/health checks
    const header = request.headers.get("authorization") ?? "";
    if (header === `Bearer ${token}`) return;
    set.status = 401;
    return { error: "unauthorized" };
  },
);
