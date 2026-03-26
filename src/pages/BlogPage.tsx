import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import SEOHead, { createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { usePublishedBlogPosts } from "@/hooks/useBlogPosts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import { format } from "date-fns";

const BlogPage = () => {
  const { data: posts, isLoading } = usePublishedBlogPosts();

  const breadcrumbJsonLd = createBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
  ]);

  const estimateReadTime = (content: string) => {
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  return (
    <Layout>
      <SEOHead
        title="Blog"
        description="Expert tips on booking sports facilities, growing your venue business, sports tourism, and getting the most out of your athletic experience."
        canonical="/blog"
        jsonLd={breadcrumbJsonLd}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/30 py-16 md:py-24">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <BookOpen className="h-4 w-4" />
            SportsBnb Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Insights & Tips for Athletes & Venue Owners
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Expert advice on finding sports facilities, growing your venue business, and making the most of your sports experience.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="container py-12 md:py-16">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50">
                  {post.cover_image_url ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    {post.target_keyword && (
                      <Badge variant="secondary" className="mb-3 text-xs">
                        {post.target_keyword}
                      </Badge>
                    )}
                    <h2 className="text-xl font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(post.published_at), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {estimateReadTime(post.content)} min read
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No articles yet</h2>
            <p className="text-muted-foreground">Check back soon for expert tips and insights.</p>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default BlogPage;
