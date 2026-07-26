/**
 * Recognises DOM injected by a third-party map SDK, so the accessible-name
 * audit does not report defects nobody here can fix.
 *
 * This lives in its own module, with its own test, for one reason: it is a
 * regex over markup, which is a guess by construction. The right check would
 * be DOM ancestry — "is this node inside the map's own root" — but the map
 * only renders with a browser key and a reachable maps host, neither of which
 * exists in the container this was written in. So the signature is matched
 * against the exact HTML the CI run reported, pinned in the test beside it,
 * rather than against markup imagined from memory.
 *
 * The signature is deliberately narrow. A map pin is a bare `<div>` carrying
 * `role="button"`, an inline `position: absolute`, and an inline `overflow:
 * hidden` — an element positioned by script, with no class and no name. Real
 * controls in this codebase are `<button>` or `<a>`, carry Tailwind classes,
 * and are positioned by stylesheet. A `<div role="button">` with a class
 * attribute is *not* matched, because that is the shape an app-authored
 * control would have and it should still fail.
 */

/**
 * `tabindex` is accepted at 0 or -1.
 *
 * The original signature required `tabindex="0"` and passed for weeks. It
 * started failing the moment the stub harness began returning three venues
 * instead of one: more markers, and the marker elements carry `tabindex="-1"`
 * while the pan controls carry `tabindex="0"`. The audit had only ever seen
 * one map pin, so it had only ever seen half of this markup.
 */
const MAP_CONTROL =
  /^<div\b(?=[^>]*\brole="button")(?=[^>]*\btabindex="(?:0|-1)")(?=[^>]*\bstyle="[^"]*\bposition:\s*absolute)(?=[^>]*\bstyle="[^"]*\boverflow:\s*hidden)(?![^>]*\bclass=)/;

/**
 * @param {string} outerHTML Serialised element, whitespace already collapsed.
 * @returns {boolean} True when the node belongs to a third-party map SDK.
 */
export const isThirdPartyMapControl = (outerHTML) => MAP_CONTROL.test(String(outerHTML).trim());
