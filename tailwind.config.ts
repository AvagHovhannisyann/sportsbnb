import type { Config } from "tailwindcss";
import tailwindcssTypography from "@tailwindcss/typography";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        // Control edges. See the note in index.css.
        "border-interactive": "hsl(var(--border-interactive))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "foreground-soft": "hsl(var(--foreground-soft))",
        surface: {
          DEFAULT: "hsl(var(--surface-1))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
        },
        brand: {
          tuff: "hsl(var(--brand-tuff))",
          "tuff-soft": "hsl(var(--brand-tuff-soft))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          // Fill behind white text. See the note in index.css.
          solid: "hsl(var(--destructive-solid))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        information: "hsl(var(--information))",
        // The categorical five. They were already tokens in index.css for both
        // themes, but only reachable from JS as `var(--chart-N)` — so anything
        // in markup that needed a non-semantic colour reached for raw Tailwind
        // palette instead. Exposing them here is what makes `text-chart-4`
        // resolve rather than silently render nothing.
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        "2xl": "calc(var(--radius) + 8px)",
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontSize: {
        /**
         * The two half-steps this design actually uses.
         *
         * Tailwind's scale jumps 12 → 14 → 16, and the product sits between
         * those twice: metadata rows ("Yerevan · Football · 4.6") want 13, and
         * dense body copy wants 15. Both were being written as `text-[13px]`
         * and `text-[15px]` — 34 times across 21 files, which is a magic number
         * repeated until it looks like a decision.
         *
         * Naming them makes them tokens, so the size can be changed in one
         * place, and so a reviewer can tell "this is the metadata size" from
         * "someone typed a number".
         *
         * Nothing smaller than `xs` (12px) exists on purpose. The codebase had
         * `text-[10px]`, `text-[0.625rem]`, `text-[11px]` and `text-[0.6875rem]`
         * in 21 places — below the floor for readable text, and small enough
         * that letterspaced uppercase at that size is genuinely hard to read.
         * They are all folded into `xs`; there is no token below it to reach
         * for.
         */
        meta: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
        ui: ["0.9375rem", { lineHeight: "1.5rem" }], // 15px
      },
      fontFamily: {
        // These point at the CSS variables rather than restating the stacks,
        // because restating them is exactly how they went wrong. `--font-*` in
        // index.css each carry 'Noto Sans Armenian' to supply U+058F, the dram
        // sign, which none of Space Grotesk, DM Sans or JetBrains Mono
        // includes — but this block was a second, independent copy without it.
        //
        // So `.stat-numeral`, which reads var(--font-mono), rendered ֏
        // correctly while every `className="font-mono"` price did not: the
        // hero's confirmation card, checkout, booking status, owner earnings.
        // Two definitions of one thing, and only one of them got fixed.
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        "extra-tight": "-0.025em",
        wider2: "0.18em",
      },
      boxShadow: {
        "2xs": "var(--shadow-2xs)",
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        "ring-primary": "var(--shadow-ring-primary)",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
} satisfies Config;
