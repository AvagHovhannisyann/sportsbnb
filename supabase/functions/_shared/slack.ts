/**
 * Direct Slack Web API — replaces the connector-gateway.lovable.dev proxy.
 * SLACK_API_KEY is a bot token (xoxb-...) with chat:write scope.
 */

export async function slackApiCall(method: string, body: Record<string, unknown>): Promise<Response> {
  const token = Deno.env.get("SLACK_API_KEY");
  if (!token) throw new Error("SLACK_API_KEY is not configured");

  return fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
