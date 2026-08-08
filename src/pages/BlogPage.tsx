import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import Layout from "@/components/layout/Layout";
import { EmptyState } from "@/components/ui/empty-state";
import SEOHead, { createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { usePublishedBlogPosts } from "@/hooks/useBlogPosts";
import { Skeleton } from "@/components/ui/skeleton";

const estimateReadTime = (content: string) => {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

const BlogPage = () => {
  const { data: posts, isLoading } = usePublishedBlogPosts();

  const breadcrumbJsonLd = createBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
  ]);

  return (
    <Layout>
      <SEOHead
        title="Blog"
        description="Expert tips on booking sports facilities, growing your venue business, sports tourism, and getting the most out of your athletic experience."
        canonical="/blog"
        jsonLd={breadcrumbJsonLd}
      />

      <header className="border-b border-border bg-surface-1">
        <div className="container grid gap-6 py-14 md:py-20 lg:grid-cols-[1fr_0.75fr] lg:items-end lg:gap-16">
          <div>
            <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-foreground-soft">
              <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
              Sportsbnb journal
            </div>
            <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Practical notes for players and venue owners.
            </h1>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-foreground-soft lg:pb-1">
            Guides to booking sports facilities, operating a venue, and making more of the time you spend playing.
          </p>
        </div>
      </header>

      <section className="container py-12 md:py-16" aria-label="Articles">
        {isLoading ? (
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading articles">
            {[1, 2, 3].map((item) => (
              <div key={item} className="border-t border-border pt-4">
                <Skeleton className="aspect-[3/2] w-full rounded-xl bg-surface-2" />
                <div className="mt-5 space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-7 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                // Named explicitly because the whole card is an <article>, and
                // `article` is one of the roles Chrome's name-from-content
                // algorithm will not descend into. The title is on screen and
                // the link still read as an unnamed "link" to a screen reader.
                aria-label={post.title}
                className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <article className="h-full border-t border-border pt-4">
                  {post.cover_image_url ? (
                    <div className="aspect-[3/2] overflow-hidden rounded-xl bg-surface-2">
                      <img
                        src={post.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[3/2] items-center justify-center rounded-xl border border-border bg-surface-1">
                      <BookOpen className="h-8 w-8 text-primary" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                  )}

                  <div className="mt-5">
                    {post.target_keyword && (
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-foreground-soft">
                        {post.target_keyword}
                      </p>
                    )}
                    <h2 className="line-clamp-2 text-xl font-semibold leading-snug text-foreground transition-colors duration-150 group-hover:text-primary">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground-soft">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      {post.published_at && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          {format(new Date(post.published_at), "MMM d, yyyy")}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {estimateReadTime(post.content)} min read
                      </span>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Read article
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No articles yet"
            description="Check back soon for tips and product updates."
          />
        )}
      </section>
    </Layout>
  );
};

export default BlogPage;
