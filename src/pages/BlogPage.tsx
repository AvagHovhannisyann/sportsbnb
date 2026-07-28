import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { EmptyState } from "@/components/ui/empty-state";
import SEOHead, { createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { usePublishedBlogPosts } from "@/hooks/useBlogPosts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { easeOutExpo } from "@/lib/motion";

/* ------------------------------------------------------------------
   Motion.

   Two things move: the post cards deal in, and the read-time row
   settles a beat after the card it belongs to. Everything else — the
   hover lift, the cover zoom — is the shared `.card-lift` treatment
   and a transform, so this page adds no new hover vocabulary.

   Easing comes from lib/motion, which mirrors --ease-out-expo in
   index.css. Under `prefers-reduced-motion: reduce` the props are
   omitted entirely rather than given a zero duration, so cards mount
   in their final state — the convention HomePage and DiscoverPage
   established.
   ------------------------------------------------------------------ */

/** Gap between one card's entrance and the next. */
const CARD_STAGGER_STEP = 0.05;
/**
 * The index past which every remaining card shares the last delay.
 *
 * The listing is unpaginated — `usePublishedBlogPosts` returns every
 * published post — so without a cap a growing blog would eventually be
 * dealing out cards a second after the data landed. Capped, the
 * stagger costs 400ms whether there are three posts or ninety.
 */
const CARD_STAGGER_CAP = 8;

const cardDelay = (index: number) => Math.min(index, CARD_STAGGER_CAP) * CARD_STAGGER_STEP;

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutExpo, delay: cardDelay(index) },
  }),
};

/**
 * The date + read-time row, arriving just behind its own card.
 *
 * Translate only, deliberately: this row is a descendant of the card,
 * which is already fading in, and a nested opacity animation would
 * fade it twice — visibly slower than everything around it. Riding the
 * card's fade and adding only the settle keeps it one entrance with a
 * late beat rather than two competing ones.
 */
const metaVariants: Variants = {
  hidden: { y: 6 },
  visible: (index: number) => ({
    y: 0,
    transition: { duration: 0.25, ease: easeOutExpo, delay: cardDelay(index) + 0.18 },
  }),
};

const BlogPage = () => {
  const { data: posts, isLoading } = usePublishedBlogPosts();
  const prefersReduced = useReducedMotion();

  const cardMotion = (index: number): MotionProps =>
    prefersReduced
      ? {}
      : { variants: cardVariants, initial: "hidden", animate: "visible", custom: index };

  const metaMotion = (index: number): MotionProps =>
    prefersReduced
      ? {}
      : { variants: metaVariants, initial: "hidden", animate: "visible", custom: index };

  // Hover affordances are withheld rather than undone with `motion-reduce:`
  // utilities: those have to out-specify the class they are cancelling, and
  // two utilities of equal specificity are settled by stylesheet order.
  const coverZoom = `w-full h-full object-cover${
    prefersReduced ? "" : " transition-transform duration-300 group-hover:scale-105"
  }`;
  // The read-more arrow is the card's one hover embellishment: it fades in
  // and leans toward where the click goes.
  const readArrow = `h-4 w-4 text-primary opacity-0 group-hover:opacity-100${
    prefersReduced
      ? ""
      : " -translate-x-1 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0"
  }`;

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
            {posts.map((post, index) => (
              <motion.div key={post.id} {...cardMotion(index)}>
                <Link to={`/blog/${post.slug}`} className="group block h-full">
                <Card className="card-lift h-full overflow-hidden border-border/50">
                  {post.cover_image_url ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className={coverZoom}
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
                    <motion.div
                      {...metaMotion(index)}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
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
                      <ArrowRight className={readArrow} />
                    </motion.div>
                  </CardContent>
                </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No articles yet"
            description="Check back soon for expert tips and insights."
          />
        )}
      </section>
    </Layout>
  );
};

export default BlogPage;
