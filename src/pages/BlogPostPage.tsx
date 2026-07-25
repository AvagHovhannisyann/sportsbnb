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
        <div className="container max-w-3xl py-12">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-64 mb-8" />
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

      <article className="container max-w-3xl py-12">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          All articles
        </Link>

        {/* Header */}
        <header className="mb-10">
          {post.target_keyword && (
            <Badge variant="secondary" className="mb-4">
              {post.target_keyword}
            </Badge>
          )}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author_name}
            </span>
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.published_at), "MMMM d, yyyy")}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {estimateReadTime(post.content)} min read
            </span>
          </div>
        </header>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="rounded-xl overflow-hidden mb-10">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-strong:text-foreground">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* Footer CTA */}
        <div className="mt-16 p-8 bg-primary/5 rounded-2xl text-center border border-primary/10">
          <h3 className="text-xl font-semibold text-foreground mb-2">Ready to get started?</h3>
          <p className="text-muted-foreground mb-4">Find and book sports venues near you, or list your facility today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/venues">Browse Venues</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/for-owners">List Your Venue</Link>
            </Button>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default BlogPostPage;
