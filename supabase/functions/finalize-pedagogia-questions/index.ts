import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// SAFETY HOTFIX — 2026-10-10
// The previous implementation rewrote published questions directly in production.
// This legacy endpoint is intentionally disabled until a read-only Professor audit
// worker is implemented and validated. Do not restore the Groq rewrite loop.
Deno.serve((_req: Request) => new Response(JSON.stringify({
  ok: false,
  code: "LEGACY_WRITER_DISABLED",
  message: "Este worker foi desativado para proteger questões publicadas. Use o fluxo de auditoria somente leitura do Professor."
}), {
  status: 410,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }
}));
