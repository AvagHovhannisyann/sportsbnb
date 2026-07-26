import { describe, it, expect } from "vitest";
import { isThirdPartyMapControl } from "./third-party-dom.mjs";

/**
 * The two strings below are copied verbatim from the CI run that failed
 * (job 89820732858, head 440b236), truncated exactly as the audit truncates
 * them. The map SDK does not render in the container this was developed in —
 * no browser key, and the maps host is unreachable — so these are the only
 * honest specimens available, and pinning them is what makes the matcher
 * verifiable at all rather than a guess that happens to go green.
 */
const FROM_CI = [
  '<div title="" role="button" tabindex="-1" style="width: 32px; height: 32px; overflow: hidden; position: absolute; cursor',
  '<div role="button" tabindex="-1" style="width: 26px; height: 37px; overflow: hidden; position: absolute; left: -13px; to',
];

/** The pan controls, which the original `tabindex="0"` signature did catch. */
const PAN_CONTROL =
  '<div role="button" tabindex="0" style="position: absolute; overflow: hidden; width: 40px; height: 40px;"></div>';

describe("third-party map DOM", () => {
  it("recognises the marker controls that failed CI", () => {
    for (const html of FROM_CI) expect(isThirdPartyMapControl(html)).toBe(true);
  });

  it("still recognises the pan controls the old signature caught", () => {
    expect(isThirdPartyMapControl(PAN_CONTROL)).toBe(true);
  });

  // The whole point of the exclusion is that it excludes *their* markup and
  // not ours. If it ever starts swallowing an app control, the audit has
  // quietly stopped auditing.
  it("does not excuse an unnamed control this codebase authored", () => {
    expect(
      isThirdPartyMapControl(
        '<button class="inline-flex items-center justify-center rounded-md"><svg></svg></button>',
      ),
    ).toBe(false);

    // A div-as-button is already a defect; carrying a class marks it as ours.
    expect(
      isThirdPartyMapControl(
        '<div role="button" tabindex="0" class="absolute top-3 right-3" style="position: absolute; overflow: hidden"></div>',
      ),
    ).toBe(false);

    // Absolutely positioned, but no role and no tabindex: not a control.
    expect(
      isThirdPartyMapControl('<div style="position: absolute; overflow: hidden"></div>'),
    ).toBe(false);

    // A real control that merely happens to be positioned by script.
    expect(
      isThirdPartyMapControl('<a role="button" tabindex="0" style="position: absolute"></a>'),
    ).toBe(false);
  });

  it("requires both inline position and overflow, not either alone", () => {
    expect(
      isThirdPartyMapControl('<div role="button" tabindex="-1" style="position: absolute"></div>'),
    ).toBe(false);
    expect(
      isThirdPartyMapControl('<div role="button" tabindex="-1" style="overflow: hidden"></div>'),
    ).toBe(false);
  });
});
