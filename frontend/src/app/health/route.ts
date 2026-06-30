// Лёгкий health-эндпоинт для Docker healthcheck фронтенда.
// Dockerfile пингует http://localhost:3000/health.
export const dynamic = "force-static";

export function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
