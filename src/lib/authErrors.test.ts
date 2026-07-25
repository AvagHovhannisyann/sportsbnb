import { describe, it, expect, vi, beforeEach } from "vitest";
import { getGenericAuthError } from "./authErrors";

// The mapper logs the raw error for debugging; silence it in tests.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getGenericAuthError", () => {
  it("does not blame credentials when the OAuth provider is disabled", () => {
    // The regression this guards: a project with only `email` enabled returned
    // "Unsupported provider: provider is not enabled" from signInWithOAuth,
    // which the login branch collapsed into "Invalid email or password" — for
    // credentials the user never typed, on a button they could not make work.
    for (const raw of [
      "Unsupported provider: provider is not enabled",
      "Provider is not enabled",
    ]) {
      const msg = getGenericAuthError(new Error(raw), "login");
      // It may still point at the password form as the way forward — what it
      // must never do is report the attempt as rejected credentials.
      expect(msg).not.toBe("Invalid email or password");
      expect(msg).toMatch(/not available/i);
    }
  });

  it("reports rate limiting as rate limiting on both flows", () => {
    for (const context of ["login", "signup"] as const) {
      expect(getGenericAuthError(new Error("Email rate limit exceeded"), context)).toMatch(
        /too many attempts/i
      );
    }
  });

  it("distinguishes an unreachable server from bad credentials", () => {
    const msg = getGenericAuthError(new TypeError("Failed to fetch"), "login");
    expect(msg).not.toBe("Invalid email or password");
    expect(msg).toMatch(/connection/i);
  });

  it("still refuses to confirm whether an account exists on login", () => {
    // Account enumeration defence: a genuinely wrong password and an unknown
    // email must be indistinguishable.
    expect(getGenericAuthError(new Error("Invalid login credentials"), "login")).toBe(
      "Invalid email or password"
    );
    expect(getGenericAuthError(new Error("User not found"), "login")).toBe(
      "Invalid email or password"
    );
  });

  it("tells a returning user to sign in instead of failing opaquely", () => {
    expect(
      getGenericAuthError(new Error("User already registered"), "signup")
    ).toMatch(/already exists/i);
  });

  it("falls back to a non-committal message for unrecognised failures", () => {
    expect(getGenericAuthError(new Error("boom"), "signup")).toMatch(
      /unable to create account/i
    );
  });
});
