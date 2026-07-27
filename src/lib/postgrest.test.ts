import { describe, it, expect } from "vitest";
import { pgQuote, orIlike } from "./postgrest";

describe("pgQuote", () => {
  it("wraps a plain value in quotes", () => {
    expect(pgQuote("Arena")).toBe('"Arena"');
  });

  it("escapes a double quote, which would otherwise close the value early", () => {
    expect(pgQuote('the "Big" Arena')).toBe('"the \\"Big\\" Arena"');
  });

  it("escapes a backslash before it can escape something else", () => {
    expect(pgQuote("a\\b")).toBe('"a\\\\b"');
    // Order matters: escaping quotes first would double-escape the backslash
    // this introduces. Backslash first is the only correct order.
    expect(pgQuote('a\\"b')).toBe('"a\\\\\\"b"');
  });

  it("leaves the grammar characters alone — quoting is what neutralises them", () => {
    expect(pgQuote("a,b(c)d.e:f")).toBe('"a,b(c)d.e:f"');
  });
});

describe("orIlike", () => {
  it("builds a contains-match across columns", () => {
    expect(orIlike(["name", "city"], "Arena")).toBe('name.ilike."%Arena%",city.ilike."%Arena%"');
  });

  it("survives the comma that used to 400 the request", () => {
    // The exact input that broke it: an address, written the way people write
    // addresses. Unquoted this became a second, malformed filter.
    expect(orIlike(["name"], "Arena, Yerevan")).toBe('name.ilike."%Arena, Yerevan%"');
  });

  it("survives brackets, which group filters in the grammar", () => {
    expect(orIlike(["title"], "Court (indoor)")).toBe('title.ilike."%Court (indoor)%"');
  });

  it("survives a value that looks like a filter itself", () => {
    // Someone typing this is not attacking anything, but an unquoted value
    // that parses as grammar is the whole failure mode.
    expect(orIlike(["name"], "id.eq.1")).toBe('name.ilike."%id.eq.1%"');
  });

  it("keeps % and _ as wildcards rather than escaping them", () => {
    // They are ILIKE semantics, not grammar — they cannot break the request,
    // and a person typing "50%" means a literal they would be surprised to see
    // escaped.
    expect(orIlike(["name"], "50%")).toBe('name.ilike."%50%%"');
  });

  it("produces one filter per column, comma-joined as .or() expects", () => {
    const out = orIlike(["a", "b", "c"], "x");
    expect(out.split('",').length).toBe(3);
    expect(out.startsWith("a.ilike.")).toBe(true);
  });

  it("handles an empty term without producing malformed syntax", () => {
    expect(orIlike(["name"], "")).toBe('name.ilike."%%"');
  });
});
