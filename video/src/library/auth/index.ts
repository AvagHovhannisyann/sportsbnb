/**
 * The auth / onboarding / account composition family — 25 pieces covering
 * /login, /signup, the OTP and password surfaces, first-run, role choice,
 * onboarding progress, session failure and account creation.
 * Re-exports every composition plus `authCompositions`, the registry a Root can
 * map over. This folder never edits Root.tsx itself.
 */

import type { FC } from "react";

import {
  AccountCreatedCheck,
  accountCreatedCheckDefaultProps,
  type AccountCreatedCheckProps,
} from "./AccountCreatedCheck";
import {
  AccountCreatedHandoff,
  accountCreatedHandoffDefaultProps,
  type AccountCreatedHandoffProps,
} from "./AccountCreatedHandoff";
import {
  FieldValidationFeedback,
  fieldValidationFeedbackDefaultProps,
  type FieldValidationFeedbackProps,
} from "./FieldValidationFeedback";
import {
  FirstRunTourHint,
  firstRunTourHintDefaultProps,
  type FirstRunTourHintProps,
} from "./FirstRunTourHint";
import {
  FirstRunWelcomeCurtain,
  firstRunWelcomeCurtainDefaultProps,
  type FirstRunWelcomeCurtainProps,
} from "./FirstRunWelcomeCurtain";
import {
  LoginPanelCityPulse,
  loginPanelCityPulseDefaultProps,
  type LoginPanelCityPulseProps,
} from "./LoginPanelCityPulse";
import {
  LoginPanelCourtDrift,
  loginPanelCourtDriftDefaultProps,
  type LoginPanelCourtDriftProps,
} from "./LoginPanelCourtDrift";
import {
  LoginPanelFloodlightHaze,
  loginPanelFloodlightHazeDefaultProps,
  type LoginPanelFloodlightHazeProps,
} from "./LoginPanelFloodlightHaze";
import {
  LoginPanelPitchLines,
  loginPanelPitchLinesDefaultProps,
  type LoginPanelPitchLinesProps,
} from "./LoginPanelPitchLines";
import {
  OnboardingChecklistItemComplete,
  onboardingChecklistItemCompleteDefaultProps,
  type OnboardingChecklistItemCompleteProps,
} from "./OnboardingChecklistItemComplete";
import {
  OnboardingChecklistProgress,
  onboardingChecklistProgressDefaultProps,
  type ChecklistTask,
  type OnboardingChecklistProgressProps,
} from "./OnboardingChecklistProgress";
import {
  OnboardingProfileCompletionRing,
  onboardingProfileCompletionRingDefaultProps,
  type OnboardingProfileCompletionRingProps,
} from "./OnboardingProfileCompletionRing";
import {
  OtpCodeAccepted,
  otpCodeAcceptedDefaultProps,
  type OtpCodeAcceptedProps,
} from "./OtpCodeAccepted";
import {
  OtpWaitingForCode,
  otpWaitingForCodeDefaultProps,
  type OtpWaitingForCodeProps,
} from "./OtpWaitingForCode";
import {
  OtpWrongCode,
  otpWrongCodeDefaultProps,
  type OtpWrongCodeProps,
} from "./OtpWrongCode";
import {
  PasswordRequirementChecklist,
  passwordRequirementChecklistDefaultProps,
  type PasswordRequirement,
  type PasswordRequirementChecklistProps,
} from "./PasswordRequirementChecklist";
import {
  PasswordStrengthMeter,
  passwordStrengthMeterDefaultProps,
  type PasswordStrengthMeterProps,
} from "./PasswordStrengthMeter";
import {
  RoleChoicePlayer,
  roleChoicePlayerDefaultProps,
  type RoleChoicePlayerProps,
} from "./RoleChoicePlayer";
import {
  RoleChoiceVenueOwner,
  roleChoiceVenueOwnerDefaultProps,
  type RoleChoiceVenueOwnerProps,
} from "./RoleChoiceVenueOwner";
import {
  SessionExpiredLocked,
  sessionExpiredLockedDefaultProps,
  type SessionExpiredLockedProps,
} from "./SessionExpiredLocked";
import {
  SessionSignedOutIdle,
  sessionSignedOutIdleDefaultProps,
  type SessionSignedOutIdleProps,
} from "./SessionSignedOutIdle";
import {
  SignupStepAdvanceTransition,
  signupStepAdvanceTransitionDefaultProps,
  type SignupStepAdvanceTransitionProps,
} from "./SignupStepAdvanceTransition";
import {
  SignupStepDots,
  signupStepDotsDefaultProps,
  type SignupStepDotsProps,
} from "./SignupStepDots";
import {
  SignupStepProgressBar,
  signupStepProgressBarDefaultProps,
  type SignupStepProgressBarProps,
} from "./SignupStepProgressBar";
import {
  WelcomeBackGreeting,
  welcomeBackGreetingDefaultProps,
  type WelcomeBackGreetingProps,
} from "./WelcomeBackGreeting";

/* ─────────────────────────────── components ────────────────────────────── */

export {
  AccountCreatedCheck,
  AccountCreatedHandoff,
  FieldValidationFeedback,
  FirstRunTourHint,
  FirstRunWelcomeCurtain,
  LoginPanelCityPulse,
  LoginPanelCourtDrift,
  LoginPanelFloodlightHaze,
  LoginPanelPitchLines,
  OnboardingChecklistItemComplete,
  OnboardingChecklistProgress,
  OnboardingProfileCompletionRing,
  OtpCodeAccepted,
  OtpWaitingForCode,
  OtpWrongCode,
  PasswordRequirementChecklist,
  PasswordStrengthMeter,
  RoleChoicePlayer,
  RoleChoiceVenueOwner,
  SessionExpiredLocked,
  SessionSignedOutIdle,
  SignupStepAdvanceTransition,
  SignupStepDots,
  SignupStepProgressBar,
  WelcomeBackGreeting,
};

/* ──────────────────────────── props + defaults ─────────────────────────── */

export {
  accountCreatedCheckDefaultProps,
  accountCreatedHandoffDefaultProps,
  fieldValidationFeedbackDefaultProps,
  firstRunTourHintDefaultProps,
  firstRunWelcomeCurtainDefaultProps,
  loginPanelCityPulseDefaultProps,
  loginPanelCourtDriftDefaultProps,
  loginPanelFloodlightHazeDefaultProps,
  loginPanelPitchLinesDefaultProps,
  onboardingChecklistItemCompleteDefaultProps,
  onboardingChecklistProgressDefaultProps,
  onboardingProfileCompletionRingDefaultProps,
  otpCodeAcceptedDefaultProps,
  otpWaitingForCodeDefaultProps,
  otpWrongCodeDefaultProps,
  passwordRequirementChecklistDefaultProps,
  passwordStrengthMeterDefaultProps,
  roleChoicePlayerDefaultProps,
  roleChoiceVenueOwnerDefaultProps,
  sessionExpiredLockedDefaultProps,
  sessionSignedOutIdleDefaultProps,
  signupStepAdvanceTransitionDefaultProps,
  signupStepDotsDefaultProps,
  signupStepProgressBarDefaultProps,
  welcomeBackGreetingDefaultProps,
};

export type {
  AccountCreatedCheckProps,
  AccountCreatedHandoffProps,
  ChecklistTask,
  FieldValidationFeedbackProps,
  FirstRunTourHintProps,
  FirstRunWelcomeCurtainProps,
  LoginPanelCityPulseProps,
  LoginPanelCourtDriftProps,
  LoginPanelFloodlightHazeProps,
  LoginPanelPitchLinesProps,
  OnboardingChecklistItemCompleteProps,
  OnboardingChecklistProgressProps,
  OnboardingProfileCompletionRingProps,
  OtpCodeAcceptedProps,
  OtpWaitingForCodeProps,
  OtpWrongCodeProps,
  PasswordRequirement,
  PasswordRequirementChecklistProps,
  PasswordStrengthMeterProps,
  RoleChoicePlayerProps,
  RoleChoiceVenueOwnerProps,
  SessionExpiredLockedProps,
  SessionSignedOutIdleProps,
  SignupStepAdvanceTransitionProps,
  SignupStepDotsProps,
  SignupStepProgressBarProps,
  WelcomeBackGreetingProps,
};

/* ─────────────────────────────── the registry ──────────────────────────── */

export type AuthCompositionEntry = {
  /** Stable id. Also the folder name a render lands in. */
  id: string;
  /**
   * The component, with its prop type erased.
   *
   * The registry is heterogeneous — 25 different prop shapes — so the pair
   * cannot stay tied in a single array type. `defineAuthComposition` below is
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
   * event-driven and plays once.
   */
  seamless: boolean;
};

type AuthCompositionSpec<P extends Record<string, unknown>> = {
  id: string;
  component: FC<P>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: P;
  seamless: boolean;
};

const defineAuthComposition = <P extends Record<string, unknown>>(
  spec: AuthCompositionSpec<P>,
): AuthCompositionEntry => ({
  id: spec.id,
  component: spec.component as unknown as FC<never>,
  durationInFrames: spec.durationInFrames,
  fps: spec.fps,
  width: spec.width,
  height: spec.height,
  defaultProps: spec.defaultProps,
  seamless: spec.seamless,
});

export const authCompositions: AuthCompositionEntry[] = [
  /* ── Login side-panel ambient loops ─────────────────────────────────── */
  defineAuthComposition({
    id: "AuthLoginPanelCourtDrift",
    component: LoginPanelCourtDrift,
    durationInFrames: 300,
    fps: 30,
    width: 960,
    height: 1080,
    defaultProps: loginPanelCourtDriftDefaultProps,
    seamless: true,
  }),
  defineAuthComposition({
    id: "AuthLoginPanelFloodlightHaze",
    component: LoginPanelFloodlightHaze,
    durationInFrames: 360,
    fps: 30,
    width: 960,
    height: 1080,
    defaultProps: loginPanelFloodlightHazeDefaultProps,
    seamless: true,
  }),
  defineAuthComposition({
    id: "AuthLoginPanelPitchLines",
    component: LoginPanelPitchLines,
    durationInFrames: 240,
    fps: 30,
    width: 960,
    height: 1080,
    defaultProps: loginPanelPitchLinesDefaultProps,
    seamless: true,
  }),
  defineAuthComposition({
    id: "AuthLoginPanelCityPulse",
    component: LoginPanelCityPulse,
    durationInFrames: 300,
    fps: 30,
    width: 960,
    height: 1080,
    defaultProps: loginPanelCityPulseDefaultProps,
    seamless: true,
  }),

  /* ── Signup step progress ───────────────────────────────────────────── */
  defineAuthComposition({
    id: "AuthSignupStepProgressBar",
    component: SignupStepProgressBar,
    durationInFrames: 90,
    fps: 30,
    width: 720,
    height: 180,
    defaultProps: signupStepProgressBarDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthSignupStepDots",
    component: SignupStepDots,
    durationInFrames: 120,
    fps: 30,
    width: 720,
    height: 200,
    defaultProps: signupStepDotsDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthSignupStepAdvanceTransition",
    component: SignupStepAdvanceTransition,
    durationInFrames: 60,
    fps: 30,
    width: 720,
    height: 560,
    defaultProps: signupStepAdvanceTransitionDefaultProps,
    seamless: false,
  }),

  /* ── OTP / code entry ───────────────────────────────────────────────── */
  defineAuthComposition({
    id: "AuthOtpWaitingForCode",
    component: OtpWaitingForCode,
    durationInFrames: 150,
    fps: 30,
    width: 720,
    height: 300,
    defaultProps: otpWaitingForCodeDefaultProps,
    seamless: true,
  }),
  defineAuthComposition({
    id: "AuthOtpCodeAccepted",
    component: OtpCodeAccepted,
    durationInFrames: 90,
    fps: 30,
    width: 720,
    height: 340,
    defaultProps: otpCodeAcceptedDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthOtpWrongCode",
    component: OtpWrongCode,
    durationInFrames: 60,
    fps: 30,
    width: 720,
    height: 300,
    defaultProps: otpWrongCodeDefaultProps,
    seamless: false,
  }),

  /* ── Password strength and validation ───────────────────────────────── */
  defineAuthComposition({
    id: "AuthPasswordStrengthMeter",
    component: PasswordStrengthMeter,
    durationInFrames: 120,
    fps: 60,
    width: 720,
    height: 240,
    defaultProps: passwordStrengthMeterDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthPasswordRequirementChecklist",
    component: PasswordRequirementChecklist,
    durationInFrames: 120,
    fps: 30,
    width: 720,
    height: 380,
    defaultProps: passwordRequirementChecklistDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthFieldValidationFeedback",
    component: FieldValidationFeedback,
    durationInFrames: 90,
    fps: 30,
    width: 720,
    height: 260,
    defaultProps: fieldValidationFeedbackDefaultProps,
    seamless: false,
  }),

  /* ── Welcome / first run ────────────────────────────────────────────── */
  defineAuthComposition({
    id: "AuthWelcomeBackGreeting",
    component: WelcomeBackGreeting,
    durationInFrames: 120,
    fps: 30,
    width: 1200,
    height: 630,
    defaultProps: welcomeBackGreetingDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthFirstRunWelcomeCurtain",
    component: FirstRunWelcomeCurtain,
    durationInFrames: 150,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: firstRunWelcomeCurtainDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthFirstRunTourHint",
    component: FirstRunTourHint,
    durationInFrames: 120,
    fps: 30,
    width: 720,
    height: 400,
    defaultProps: firstRunTourHintDefaultProps,
    seamless: true,
  }),

  /* ── Role choice ────────────────────────────────────────────────────── */
  defineAuthComposition({
    id: "AuthRoleChoicePlayer",
    component: RoleChoicePlayer,
    durationInFrames: 90,
    fps: 30,
    width: 720,
    height: 320,
    defaultProps: roleChoicePlayerDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthRoleChoiceVenueOwner",
    component: RoleChoiceVenueOwner,
    durationInFrames: 90,
    fps: 30,
    width: 720,
    height: 320,
    defaultProps: roleChoiceVenueOwnerDefaultProps,
    seamless: false,
  }),

  /* ── Onboarding checklist ───────────────────────────────────────────── */
  defineAuthComposition({
    id: "AuthOnboardingChecklistProgress",
    component: OnboardingChecklistProgress,
    durationInFrames: 180,
    fps: 30,
    width: 720,
    height: 560,
    defaultProps: onboardingChecklistProgressDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthOnboardingProfileCompletionRing",
    component: OnboardingProfileCompletionRing,
    durationInFrames: 150,
    fps: 60,
    width: 600,
    height: 600,
    defaultProps: onboardingProfileCompletionRingDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthOnboardingChecklistItemComplete",
    component: OnboardingChecklistItemComplete,
    durationInFrames: 60,
    fps: 30,
    width: 720,
    height: 140,
    defaultProps: onboardingChecklistItemCompleteDefaultProps,
    seamless: false,
  }),

  /* ── Session states ─────────────────────────────────────────────────── */
  defineAuthComposition({
    id: "AuthSessionSignedOutIdle",
    component: SessionSignedOutIdle,
    durationInFrames: 240,
    fps: 30,
    width: 720,
    height: 720,
    defaultProps: sessionSignedOutIdleDefaultProps,
    seamless: true,
  }),
  defineAuthComposition({
    id: "AuthSessionExpiredLocked",
    component: SessionExpiredLocked,
    durationInFrames: 120,
    fps: 30,
    width: 960,
    height: 540,
    defaultProps: sessionExpiredLockedDefaultProps,
    seamless: false,
  }),

  /* ── Account created ────────────────────────────────────────────────── */
  defineAuthComposition({
    id: "AuthAccountCreatedCheck",
    component: AccountCreatedCheck,
    durationInFrames: 120,
    fps: 30,
    width: 1080,
    height: 1080,
    defaultProps: accountCreatedCheckDefaultProps,
    seamless: false,
  }),
  defineAuthComposition({
    id: "AuthAccountCreatedHandoff",
    component: AccountCreatedHandoff,
    durationInFrames: 150,
    fps: 30,
    width: 1200,
    height: 675,
    defaultProps: accountCreatedHandoffDefaultProps,
    seamless: false,
  }),
];
