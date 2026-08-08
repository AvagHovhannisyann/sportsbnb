import { Check } from "lucide-react";

import Layout from "@/components/layout/Layout";
import SEOHead, { createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { getOwnerGuide, type GuideBlock } from "@/content/ownerGuide";
import { useLanguage } from "@/hooks/useLanguage";

/**
 * The venue owner guide, in the app rather than in a document nobody opens.
 *
 * Rendered from structured content (src/content/ownerGuide.ts) instead of a
 * markdown blob, so every heading is a real heading. That is what gives a
 * screen-reader user a navigable outline, and what keeps this page passing the
 * heading-outline check rather than being one <div> of prose.
 *
 * Both languages are complete. Switching language re-renders the whole guide —
 * there is no partial state where an Armenian reader gets English sections.
 */

function Block({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case "note":
      return (
        <div className="my-5 rounded-xl border-l-4 border-primary bg-primary-soft px-5 py-4">
          <p className="text-ui leading-relaxed text-foreground">{block.body}</p>
        </div>
      );

    case "steps":
      return (
        <ol className="my-4 space-y-2.5">
          {block.items?.map((item, i) => (
            <li key={i} className="flex gap-3 text-ui leading-relaxed text-foreground-soft">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-meta font-semibold text-primary"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );

    case "checklist":
      return (
        <ul className="my-4 space-y-2.5">
          {block.items?.map((item, i) => (
            <li key={i} className="flex gap-3 text-ui leading-relaxed text-foreground-soft">
              <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        // Wide content scrolls inside its own box; the page body never scrolls
        // sideways, which the surface suite checks on every route.
        <div className="my-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead className="bg-surface-1">
              <tr>
                {block.head?.map((cell) => (
                  <th
                    key={cell}
                    scope="col"
                    className="px-4 py-3 text-meta font-semibold uppercase tracking-[0.08em] text-foreground-soft"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows?.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={
                        j === 0
                          ? "px-4 py-3 text-ui font-medium text-foreground"
                          : "px-4 py-3 text-ui leading-relaxed text-foreground-soft"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return (
        <p className="my-4 text-ui leading-relaxed text-foreground-soft">{block.body}</p>
      );
  }
}

const OwnerGuidePage = () => {
  const { language, t } = useLanguage();
  const guide = getOwnerGuide(language);

  return (
    <Layout>
      <SEOHead
        title={t("ownerGuide.metaTitle")}
        description={t("ownerGuide.metaDescription")}
        canonical="/owner-guide"
        jsonLd={createBreadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: guide.title, url: "/owner-guide" },
        ])}
      />

      <header className="border-b border-border bg-surface-1">
        <div className="container max-w-3xl py-14 md:py-20">
          <h1 className="text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-foreground-soft">{guide.intro}</p>
          <p className="mt-4 text-meta uppercase tracking-[0.12em] text-muted-foreground">
            {guide.readingTime}
          </p>
        </div>
      </header>

      <div className="container max-w-3xl py-12 md:py-16">
        {/* On-page contents. Long documents are read by jumping, not scrolling,
            and this is also the fastest way back to a section someone is
            actively following while setting their venue up. */}
        <nav aria-label={guide.title} className="mb-12 rounded-xl border border-border bg-card p-5">
          <ol className="space-y-2">
            {guide.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-ui text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {guide.sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-semibold tracking-extra-tight text-foreground">
              {section.title}
            </h2>
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </section>
        ))}
      </div>
    </Layout>
  );
};

export default OwnerGuidePage;
