import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { StatusPanel, ErrorPanel } from "@/components/common/StatusPanel";
import SEOHead, { createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { useBlogPostBySlug } from "@/hooks/useBlogPosts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowLeft, User, FileQuestion } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const {
    data: post,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useBlogPostBySlug(slug || "");

  const estimateReadTime = (content: string) => {
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-3xl py-12 md:py-16" role="status" aria-label="Loading article">
          <Skeleton className="mb-10 h-5 w-32" />
          <Skeleton className="mb-4 h-12 w-full" />
          <Skeleton className="mb-10 h-6 w-64" />
          <Skeleton className="mb-10 aspect-[16/9] w-full rounded-xl" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // `error || !post` used to collapse into a single "Article not found" — and
  // noIndex'd it, telling crawlers the article was gone on the strength of a
  // transient 500. A failed fetch says nothing about whether the post exists.
  if (error) {
    return (
      <Layout>
        <div className="container max-w-3xl">
          <ErrorPanel what="this article" onRetry={() => refetch()} isRetrying={isFetching}>
            <Button variant="outline" asChild>
              <Link to="/blog">Back to blog</Link>
            </Button>
          </ErrorPanel>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <SEOHead title="Post Not Found" noIndex />
        <div className="container max-w-3xl">
          <StatusPanel
            icon={FileQuestion}
            title="Article not found"
            description="The article you're looking for doesn't exist or has been removed."
          >
            <Button asChild>
              <Link to="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to blog
              </Link>
            </Button>
          </StatusPanel>
        </div>
      </Layout>
    );
  }

  const breadcrumbJsonLd = createBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.title,
    author: {
      "@type": "Organization",
      name: post.author_name,
    },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    publisher: {
      "@type": "Organization",
      name: "SportsBnb",
      url: "https://sportsbnb.org",
    },
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
  };

  return (
    <Layout>
      <SEOHead
        title={post.title}
        description={post.excerpt || `Read "${post.title}" on the SportsBnb blog.`}
        canonical={`/blog/${post.slug}`}
        type="article"
        image={post.cover_image_url || undefined}
        jsonLd={[breadcrumbJsonLd, articleJsonLd]}
      />

      <article className="container max-w-3xl py-12 md:py-16">
        {/* Back link */}
        <Link
          to="/blog"
          className="mb-10 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All articles
        </Link>

        {/* Header */}
        <header className="border-b border-border pb-8 md:pb-10">
          {post.target_keyword && (
            <Badge variant="secondary" className="mb-5">
              {post.target_keyword}
            </Badge>
          )}
          <h1 className="text-balance font-display text-3xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-5xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-5 text-lg leading-relaxed text-foreground-soft">{post.excerpt}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" aria-hidden="true" />
              {post.author_name}
            </span>
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {format(new Date(post.published_at), "MMMM d, yyyy")}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {estimateReadTime(post.content)} min read
            </span>
          </div>
        </header>

        {/* Cover image */}
        {/* `w-full h-auto` in a plain div reserves no height, so the article
            body sat directly under the header until the cover arrived and
            then jumped down by the image's full height. This is the only
            image in the app not already inside a sized box — every venue
            card, gallery tile and owner thumbnail has one. 16/9 matches the
            blog index cards, so a post opens at the ratio its card showed. */}
        {post.cover_image_url && (
          <div className="my-10 aspect-[16/9] overflow-hidden rounded-xl border border-border bg-surface-2 md:my-12">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="h-full w-full object-cover"
              decoding="async"
            />
          </div>
        )}

        {/* Content */}
        <div className={`prose prose-lg max-w-none prose-headings:font-display prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground-soft prose-a:text-primary prose-strong:text-foreground ${post.cover_image_url ? "" : "mt-10"}`}>
          {/* Markdown headings shift down one level.
              A post is written as a document — it starts at `#` — but here it
              is nested inside a page that already has an `h1` for the title.
              Rendered as-is that gives every blog post two `h1`s, one of them
              the post title and one the author's first section. Shifting the
              whole scale down keeps the author's structure intact and makes it
              a subtree of the page instead of a rival document. */}
          <ReactMarkdown
            components={{
              h1: ({ node: _node, ...props }) => <h2 {...props} />,
              h2: ({ node: _node, ...props }) => <h3 {...props} />,
              h3: ({ node: _node, ...props }) => <h4 {...props} />,
              h4: ({ node: _node, ...props }) => <h5 {...props} />,
              h5: ({ node: _node, ...props }) => <h6 {...props} />,
              h6: ({ node: _node, ...props }) => <h6 {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Footer CTA */}
        <div className="mt-16 border-t-2 border-brand-tuff pt-8 md:mt-20 md:pt-10">
          <h2 className="text-2xl font-semibold text-foreground">Put the idea into practice.</h2>
          <p className="mt-3 max-w-xl text-foreground-soft">Find a sports venue near you, or open the owner guide for listing a facility.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/venues">Browse venues</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/for-owners">For venue owners</Link>
            </Button>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default BlogPostPage;
