/**
 * Where to send someone after they sign in.
 *
 * Two things had to be true here and neither was.
 *
 * **It has to be read.** The app asked for a post-login destination in two
 * different ways. Three places — `ProtectedRoute`, `AdminRoute` and
 * `AddVenuePage` — put it in router state as `{ from: location }`, and
 * `LoginPage` honoured that. Two others put it in the query string:
 * `BookingPanel` sends `/login?redirect=/venue/:id` when a signed-out visitor
 * presses Reserve, and `JoinTeamPage` sends `/login?redirect=/join-team/:code`
 * when someone opens a team invite. Nothing anywhere read `?redirect=`. Both
 * landed on the dashboard: the first lost the venue they were about to book,
 * and the second lost the invite code entirely — there is no other route to it
 * once the link is gone.
 *
 * **It has to be checked.** A destination that arrives in a URL is attacker
 * controlled. `/login?redirect=https://not-sportsbnb.example/login` renders our
 * login form, our domain in the address bar, and hands the browser to someone
 * else's page the moment the password is accepted — with the user primed to
 * type their credentials again into whatever appears. That is a phishing
 * primitive, and it is the standard reason this parameter is on every open
 * redirect checklist. Adding the read without the check would have traded one
 * bug for a worse one.
 *
 * So: a same-origin path, or nothing.
 */

/** Paths that would bounce the user straight back to where they just were. */
const BOUNCES = new Set(["/login", "/signup"]);

/** Control characters, which nothing legitimate in a path contains. */
// eslint-disable-next-line no-control-regex -- matching them is exactly the point
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function safeRedirect(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const value = candidate.trim();

  // Must be a path on this origin. Rules out `https://evil.example`,
  // `javascript:...` and `mailto:...` in one line, since none of them start
  // with a slash.
  if (!value.startsWith("/")) return null;

  // `//evil.example` is a protocol-relative URL: it starts with a slash and
  // navigates off-site anyway. Browsers also normalise a backslash to a slash
  // in this position, so `/\evil.example` is the same attack spelt differently.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;

  // A newline or NUL smuggled through can truncate or split the value
  // somewhere downstream.
  if (CONTROL_CHARS.test(value)) return null;

  const path = value.split(/[?#]/)[0];
  if (BOUNCES.has(path)) return null;

  return value;
}
