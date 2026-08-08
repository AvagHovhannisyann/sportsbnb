import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: ReactNode;
  asideTitle: string;
  asideDescription: string;
  backTo?: string;
  backLabel?: string;
  contentClassName?: string;
};

const asideFacts = [
  { icon: MapPin, label: "Local venues" },
  { icon: ShieldCheck, label: "Protected bookings" },
  { icon: CheckCircle2, label: "Clear availability" },
];

/**
 * Shared frame for all authentication routes.
 *
 * The inverse panel gives the auth family one recognisable Sportsbnb surface
 * without relying on generic athlete photography. Its static court diagram is
 * decorative and intentionally quiet; the form remains the visual priority.
 */
export function AuthShell({
  children,
  asideTitle,
  asideDescription,
  backTo = "/",
  backLabel = "Back to home",
  contentClassName,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-secondary px-10 py-9 text-secondary-foreground lg:flex lg:flex-col xl:px-14 xl:py-12">
        <Link
          to="/"
          aria-label="Sportsbnb home"
          className="relative z-10 inline-flex min-h-11 w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-secondary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
        >
          <Logo variant="mark" className="h-9 w-9" />
          <span className="font-display text-xl font-semibold tracking-extra-tight">Sportsbnb</span>
        </Link>

        <div className="relative z-10 my-auto max-w-lg py-16">
          <p className="mb-5 text-sm font-semibold text-secondary-foreground">Your next game starts here</p>
          <p className="font-display text-4xl font-semibold leading-[1.08] tracking-tight xl:text-5xl">
            {asideTitle}
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-secondary-foreground/75 xl:text-lg">
            {asideDescription}
          </p>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3" aria-label="Sportsbnb benefits">
            {asideFacts.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-secondary-foreground/75">
                <Icon aria-hidden="true" className="h-4 w-4 text-secondary-foreground/75" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-secondary-foreground/60">
          © {new Date().getFullYear()} Sportsbnb
        </p>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-32 h-[30rem] w-[42rem] rotate-[-8deg] rounded-[3rem] border border-secondary-foreground/10"
        >
          <span className="absolute inset-y-0 left-1/2 border-l border-secondary-foreground/10" />
          <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-secondary-foreground/10" />
          <span className="absolute inset-y-[18%] left-0 w-24 border border-l-0 border-secondary-foreground/10" />
          <span className="absolute inset-y-[18%] right-0 w-24 border border-r-0 border-secondary-foreground/10" />
        </div>
      </aside>

      <main className="min-w-0 px-5 py-6 sm:px-8 sm:py-8 lg:flex lg:min-h-screen lg:items-center lg:px-12 lg:py-12 xl:px-20">
        <div className={cn("mx-auto w-full max-w-md", contentClassName)}>
          <div className="mb-8 flex items-center justify-between gap-4 lg:mb-10">
            <Link
              to="/"
              aria-label="Sportsbnb home"
              className="inline-flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
            >
              <Logo variant="full" className="h-8 w-8" />
            </Link>
            <Link
              to={backTo}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none lg:-ml-1"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {backLabel}
            </Link>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

type AuthPanelProps = {
  children: ReactNode;
  className?: string;
};

export function AuthPanel({ children, className }: AuthPanelProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-xs sm:p-7", className)}>
      {children}
    </div>
  );
}

type AuthHeadingProps = {
  title: string;
  description: string;
  className?: string;
  id?: string;
};

export function AuthHeading({ title, description, className, id }: AuthHeadingProps) {
  return (
    <header className={cn("mb-6", className)}>
      <h1 id={id} className="font-display text-3xl font-semibold leading-tight tracking-extra-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">{description}</p>
    </header>
  );
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="relative my-6" role="separator">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-3 text-xs font-medium text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}
