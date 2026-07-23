import { corsHeaders } from "./cors.ts";

export function json(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function errorResponse(req: Request, message: string, status = 500): Response {
  return json(req, { error: message }, status);
}

/** Structured log line: [FUNCTION] step - {details} */
export function makeLogger(functionName: string) {
  return (step: string, details?: Record<string, unknown>) => {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[${functionName.toUpperCase()}] ${step}${detailsStr}`);
  };
}
