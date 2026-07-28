/**
 * The micro-interaction composition family — 25 motion SPECIFICATIONS.
 *
 * This folder is not footage. Every other family in `src/library` exists to be
 * watched; this one exists to be *read*, frame by frame, by whoever has to
 * implement the interaction. Each piece shows exactly one gesture at the
 * timing the app is meant to ship, with the CSS or framer-motion equivalent,
 * the millisecond windows, and the `prefers-reduced-motion: reduce` contract
 * printed on the frame beside it. The timings are production values — 120-250ms
 * for feedback, 300-500ms for entrances — and nothing is slowed down to look
 * better on video. Every composition instead takes a `speed` prop defaulting to
 * `1`; `speed: 0.25` walks a nine-frame gesture at a quarter pace for
 * inspection, and the millisecond rail keeps reporting *spec* milliseconds so
 * it stays truthful at any speed. Halving `speed` means doubling
 * `durationInFrames` for a loop to stay seamless.
 *
 * All 25 render 960×540 at 60fps. 60 rather than 30 because one frame is
 * 16.667ms there: a 120ms press acknowledgement is seven frames at 60 and four
 * at 30, and four frames is not enough to read a curve off.
 *
 * Nothing here touches the network, a webfont or an image. Re-exports every
 * composition plus `microCompositions`, the registry a Root can map over. This
 * folder never edits Root.tsx itself.
 */

import type { FC } from "react";

import {
  BadgeCountUp,
  badgeCountUpDefaultProps,
  type BadgeCountUpProps,
} from "./BadgeCountUp";
import {
  BadgeIncrementPulse,
  badgeIncrementPulseDefaultProps,
  type BadgeIncrementPulseProps,
} from "./BadgeIncrementPulse";
import {
  ButtonDisabledFade,
  buttonDisabledFadeDefaultProps,
  type ButtonDisabledFadeProps,
} from "./ButtonDisabledFade";
import {
  ButtonHoverLift,
  buttonHoverLiftDefaultProps,
  type ButtonHoverLiftProps,
} from "./ButtonHoverLift";
import {
  ButtonLoadingSwap,
  buttonLoadingSwapDefaultProps,
  type ButtonLoadingSwapProps,
} from "./ButtonLoadingSwap";
import {
  ButtonPressScale,
  buttonPressScaleDefaultProps,
  type ButtonPressScaleProps,
} from "./ButtonPressScale";
import {
  CardHoverLift,
  cardHoverLiftDefaultProps,
  type CardHoverLiftProps,
} from "./CardHoverLift";
import {
  CardPressSettle,
  cardPressSettleDefaultProps,
  type CardPressSettleProps,
} from "./CardPressSettle";
import {
  CheckboxTickDraw,
  checkboxTickDrawDefaultProps,
  type CheckboxTickDrawProps,
} from "./CheckboxTickDraw";
import {
  DropdownItemHighlight,
  dropdownItemHighlightDefaultProps,
  type DropdownItemHighlightProps,
} from "./DropdownItemHighlight";
import {
  FocusRingInstant,
  focusRingInstantDefaultProps,
  type FocusRingInstantProps,
} from "./FocusRingInstant";
import {
  InputErrorShake,
  inputErrorShakeDefaultProps,
  type InputErrorShakeProps,
} from "./InputErrorShake";
import {
  InputFocusFill,
  inputFocusFillDefaultProps,
  type InputFocusFillProps,
} from "./InputFocusFill";
import {
  InputSuccessMatch,
  inputSuccessMatchDefaultProps,
  type InputSuccessMatchProps,
} from "./InputSuccessMatch";
import {
  KeyboardTabTraverse,
  keyboardTabTraverseDefaultProps,
  type KeyboardTabTraverseProps,
} from "./KeyboardTabTraverse";
import {
  PopoverAnchorGrow,
  popoverAnchorGrowDefaultProps,
  type PopoverAnchorGrowProps,
} from "./PopoverAnchorGrow";
import {
  RadioGroupSelection,
  radioGroupSelectionDefaultProps,
  type RadioGroupSelectionProps,
} from "./RadioGroupSelection";
import {
  SegmentedControlPill,
  segmentedControlPillDefaultProps,
  type SegmentedControlPillProps,
} from "./SegmentedControlPill";
import {
  SelectPanelOpen,
  selectPanelOpenDefaultProps,
  type SelectPanelOpenProps,
  type SelectPanelRow,
} from "./SelectPanelOpen";
import {
  SwitchThumbTravel,
  switchThumbTravelDefaultProps,
  type SwitchThumbTravelProps,
} from "./SwitchThumbTravel";
import {
  SwitchUnsavedNudge,
  switchUnsavedNudgeDefaultProps,
  type SwitchUnsavedNudgeProps,
} from "./SwitchUnsavedNudge";
import {
  TabUnderlineSlide,
  tabUnderlineSlideDefaultProps,
  type TabUnderlineSlideProps,
} from "./TabUnderlineSlide";
import {
  ToastErrorInPlace,
  toastErrorInPlaceDefaultProps,
  type ToastErrorInPlaceProps,
} from "./ToastErrorInPlace";
import {
  ToastStackShift,
  toastStackShiftDefaultProps,
  type ToastStackShiftProps,
} from "./ToastStackShift";
import {
  ToastSuccessRise,
  toastSuccessRiseDefaultProps,
  type ToastSuccessRiseProps,
} from "./ToastSuccessRise";

/* ─────────────────────────────── components ────────────────────────────── */

export {
  BadgeCountUp,
  BadgeIncrementPulse,
  ButtonDisabledFade,
  ButtonHoverLift,
  ButtonLoadingSwap,
  ButtonPressScale,
  CardHoverLift,
  CardPressSettle,
  CheckboxTickDraw,
  DropdownItemHighlight,
  FocusRingInstant,
  InputErrorShake,
  InputFocusFill,
  InputSuccessMatch,
  KeyboardTabTraverse,
  PopoverAnchorGrow,
  RadioGroupSelection,
  SegmentedControlPill,
  SelectPanelOpen,
  SwitchThumbTravel,
  SwitchUnsavedNudge,
  TabUnderlineSlide,
  ToastErrorInPlace,
  ToastStackShift,
  ToastSuccessRise,
};

/* ──────────────────────────── props + defaults ─────────────────────────── */

export {
  badgeCountUpDefaultProps,
  badgeIncrementPulseDefaultProps,
  buttonDisabledFadeDefaultProps,
  buttonHoverLiftDefaultProps,
  buttonLoadingSwapDefaultProps,
  buttonPressScaleDefaultProps,
  cardHoverLiftDefaultProps,
  cardPressSettleDefaultProps,
  checkboxTickDrawDefaultProps,
  dropdownItemHighlightDefaultProps,
  focusRingInstantDefaultProps,
  inputErrorShakeDefaultProps,
  inputFocusFillDefaultProps,
  inputSuccessMatchDefaultProps,
  keyboardTabTraverseDefaultProps,
  popoverAnchorGrowDefaultProps,
  radioGroupSelectionDefaultProps,
  segmentedControlPillDefaultProps,
  selectPanelOpenDefaultProps,
  switchThumbTravelDefaultProps,
  switchUnsavedNudgeDefaultProps,
  tabUnderlineSlideDefaultProps,
  toastErrorInPlaceDefaultProps,
  toastStackShiftDefaultProps,
  toastSuccessRiseDefaultProps,
};

export type {
  BadgeCountUpProps,
  BadgeIncrementPulseProps,
  ButtonDisabledFadeProps,
  ButtonHoverLiftProps,
  ButtonLoadingSwapProps,
  ButtonPressScaleProps,
  CardHoverLiftProps,
  CardPressSettleProps,
  CheckboxTickDrawProps,
  DropdownItemHighlightProps,
  FocusRingInstantProps,
  InputErrorShakeProps,
  InputFocusFillProps,
  InputSuccessMatchProps,
  KeyboardTabTraverseProps,
  PopoverAnchorGrowProps,
  RadioGroupSelectionProps,
  SegmentedControlPillProps,
  SelectPanelOpenProps,
  SelectPanelRow,
  SwitchThumbTravelProps,
  SwitchUnsavedNudgeProps,
  TabUnderlineSlideProps,
  ToastErrorInPlaceProps,
  ToastStackShiftProps,
  ToastSuccessRiseProps,
};

/* ───────────────────────────── shared vocabulary ───────────────────────── */

export {
  BRAND,
  DUR_MS,
  EASE_IN,
  EASE_LINEAR,
  EASE_OUT_EXPO,
  EASE_SNAP,
  EASE_SPRING,
  EASE_STANDARD,
  RADIUS,
} from "./microKit";
export { SpecStage } from "./specStage";
export type { SpecPhase, SpecStageProps, SpecTone } from "./specStage";

/* ─────────────────────────────── the registry ──────────────────────────── */

export type MicroCompositionEntry = {
  /** Stable id. Also the folder name a render lands in. */
  id: string;
  /**
   * The component, with its prop type erased.
   *
   * The registry is heterogeneous — 25 different prop shapes — so the pair
   * cannot stay tied in a single array type. `defineMicroComposition` below is
   * the only place the erasure happens, and it checks that `defaultProps`
   * really does satisfy `component`'s props before erasing anything.
   */
  component: FC<never>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, unknown>;
  /**
   * True when frame 0 and frame `durationInFrames` are the same state, i.e. the
   * piece can be looped in the app with no visible seam. False means it is
   * event-driven and plays once — a landing, a state flip, a stack collapsing —
   * and has no exit to close a cycle with. Each file's header names the exact
   * mechanism that makes its `true` true.
   */
  seamless: boolean;
};

type MicroCompositionSpec<P extends Record<string, unknown>> = {
  id: string;
  component: FC<P>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: P;
  seamless: boolean;
};

const defineMicroComposition = <P extends Record<string, unknown>>(
  spec: MicroCompositionSpec<P>,
): MicroCompositionEntry => ({
  id: spec.id,
  component: spec.component as unknown as FC<never>,
  durationInFrames: spec.durationInFrames,
  fps: spec.fps,
  width: spec.width,
  height: spec.height,
  defaultProps: spec.defaultProps,
  seamless: spec.seamless,
});

/** One canvas for the whole family — a spec sheet is a spec sheet. */
const W = 960;
const H = 540;
/** 60, not 30. One frame is 16.667ms; a 120ms gesture needs to be readable. */
const FPS = 60;

export const microCompositions: MicroCompositionEntry[] = [
  /* ── Button states — case 10, case 94 ───────────────────────────────── */
  defineMicroComposition({
    id: "MicroButtonHoverLift",
    component: ButtonHoverLift,
    durationInFrames: 120,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: buttonHoverLiftDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroButtonPressScale",
    component: ButtonPressScale,
    durationInFrames: 90,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: buttonPressScaleDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroButtonDisabledFade",
    component: ButtonDisabledFade,
    durationInFrames: 60,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: buttonDisabledFadeDefaultProps,
    seamless: false,
  }),
  defineMicroComposition({
    id: "MicroButtonLoadingSwap",
    component: ButtonLoadingSwap,
    durationInFrames: 132,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: buttonLoadingSwapDefaultProps,
    seamless: false,
  }),

  /* ── Toggles, switches, checkboxes, radios — case 96, case 71 ───────── */
  defineMicroComposition({
    id: "MicroSwitchThumbTravel",
    component: SwitchThumbTravel,
    durationInFrames: 120,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: switchThumbTravelDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroSwitchUnsavedNudge",
    component: SwitchUnsavedNudge,
    durationInFrames: 150,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: switchUnsavedNudgeDefaultProps,
    seamless: false,
  }),
  defineMicroComposition({
    id: "MicroCheckboxTickDraw",
    component: CheckboxTickDraw,
    durationInFrames: 120,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: checkboxTickDrawDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroRadioGroupSelection",
    component: RadioGroupSelection,
    durationInFrames: 180,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: radioGroupSelectionDefaultProps,
    seamless: true,
  }),

  /* ── Toasts — case 92, case 93 ──────────────────────────────────────── */
  defineMicroComposition({
    id: "MicroToastSuccessRise",
    component: ToastSuccessRise,
    durationInFrames: 288,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: toastSuccessRiseDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroToastErrorInPlace",
    component: ToastErrorInPlace,
    durationInFrames: 399,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: toastErrorInPlaceDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroToastStackShift",
    component: ToastStackShift,
    durationInFrames: 108,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: toastStackShiftDefaultProps,
    seamless: false,
  }),

  /* ── Focus rings and keyboard affordances — case 95, case 26 ────────── */
  defineMicroComposition({
    id: "MicroFocusRingInstant",
    component: FocusRingInstant,
    durationInFrames: 120,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: focusRingInstantDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroKeyboardTabTraverse",
    component: KeyboardTabTraverse,
    durationInFrames: 144,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: keyboardTabTraverseDefaultProps,
    seamless: true,
  }),

  /* ── Input states — case 95, case 72 ────────────────────────────────── */
  defineMicroComposition({
    id: "MicroInputFocusFill",
    component: InputFocusFill,
    durationInFrames: 180,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: inputFocusFillDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroInputErrorShake",
    component: InputErrorShake,
    durationInFrames: 180,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: inputErrorShakeDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroInputSuccessMatch",
    component: InputSuccessMatch,
    durationInFrames: 180,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: inputSuccessMatchDefaultProps,
    seamless: true,
  }),

  /* ── Dropdown / select / popover — case 25, case 49, case 26 ────────── */
  defineMicroComposition({
    id: "MicroSelectPanelOpen",
    component: SelectPanelOpen,
    durationInFrames: 180,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: selectPanelOpenDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroPopoverAnchorGrow",
    component: PopoverAnchorGrow,
    durationInFrames: 180,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: popoverAnchorGrowDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroDropdownItemHighlight",
    component: DropdownItemHighlight,
    durationInFrames: 168,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: dropdownItemHighlightDefaultProps,
    seamless: true,
  }),

  /* ── Tabs and segmented controls — case 33 ──────────────────────────── */
  defineMicroComposition({
    id: "MicroSegmentedControlPill",
    component: SegmentedControlPill,
    durationInFrames: 144,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: segmentedControlPillDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroTabUnderlineSlide",
    component: TabUnderlineSlide,
    durationInFrames: 162,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: tabUnderlineSlideDefaultProps,
    seamless: true,
  }),

  /* ── Card hover and press — .card-lift, case 17, case 10 ────────────── */
  defineMicroComposition({
    id: "MicroCardHoverLift",
    component: CardHoverLift,
    durationInFrames: 144,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: cardHoverLiftDefaultProps,
    seamless: true,
  }),
  defineMicroComposition({
    id: "MicroCardPressSettle",
    component: CardPressSettle,
    durationInFrames: 180,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: cardPressSettleDefaultProps,
    seamless: true,
  }),

  /* ── Badges and counters — case 13, case 53 ─────────────────────────── */
  defineMicroComposition({
    id: "MicroBadgeCountUp",
    component: BadgeCountUp,
    durationInFrames: 120,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: badgeCountUpDefaultProps,
    seamless: false,
  }),
  defineMicroComposition({
    id: "MicroBadgeIncrementPulse",
    component: BadgeIncrementPulse,
    durationInFrames: 180,
    fps: FPS,
    width: W,
    height: H,
    defaultProps: badgeIncrementPulseDefaultProps,
    seamless: true,
  }),
];
