/**
 * Putting user-typed text into a PostgREST filter without breaking the filter.
 *
 * `.or()` takes a string in PostgREST's own grammar —
 * `name.ilike.%foo%,city.ilike.%foo%` — and three search boxes built that
 * string by interpolating whatever the user typed straight into it. The
 * grammar uses `,` to separate filters and `(` `)` to group them, so a comma
 * is not a character in the search term, it is a syntax element:
 *
 *   "Arena, Yerevan"  ->  name.ilike.%Arena, Yerevan%,city.ilike....
 *                          which PostgREST reads as an extra, malformed filter
 *
 * The request comes back 400 and the search silently shows nothing. Silently,
 * because all three call sites read `res.data?.forEach(...)` and never look at
 * `res.error` — so a broken query and a genuine no-match are the same screen.
 * "Arena, Yerevan" is not an exotic input; it is how anyone writes an address.
 *
 * PostgREST's answer is to double-quote the value, and inside the quotes `\`
 * and `"` are escaped. That is all this does, and it is the whole fix: quoting
 * makes every printable character — commas, brackets, dots, colons — ordinary
 * text again.
 */
export function pgQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * An `ilike` contains-match against several columns, safely quoted.
 *
 *   orIlike(["name", "city"], "Arena, Yerevan")
 *   -> name.ilike."%Arena, Yerevan%",city.ilike."%Arena, Yerevan%"
 *
 * `%` and `_` are left alone deliberately. They are ILIKE wildcards rather
 * than grammar, so they cannot break the request — a user typing "50%" gets a
 * slightly broader match, which is a reasonable reading of what they typed and
 * not worth the surprise of escaping a character people use as a literal.
 */
export function orIlike(columns: string[], term: string): string {
  const quoted = pgQuote(`%${term}%`);
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",");
}
