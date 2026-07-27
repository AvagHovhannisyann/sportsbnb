import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VenueGalleryProps {
  images: { id: string; image_url: string; caption?: string | null }[];
  venueName: string;
  mainImage: string;
}

/** Remote venue images 404 often enough that a broken one must not paint alt
 *  text across the tile. Each tile tracks its own failure. */
const GalleryImage = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-3">
        <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />;
};

const VenueGallery = ({ images, venueName, mainImage }: VenueGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // A blank URL is not a photo. `venue_images.image_url` is nullable and can
  // hold an empty string, and `<img src="">` resolves to the page itself, so it
  // never fires onError — the tile just sits there empty. On this page that is
  // half the hero: a 670x505 grey void beside the one real photo, above the
  // fold, on the screen where someone decides whether to book.
  //
  // VenueCard already guards exactly this, with a comment describing the same
  // failure. The guard was written once and not carried to the component that
  // shows the same images four tiles at a time.
  const usable = (url: string | null | undefined) =>
    typeof url === "string" && url.trim().length > 0;

  const allImages = [
    ...(usable(mainImage) ? [{ id: "main", image_url: mainImage, caption: venueName }] : []),
    ...images.filter((img) => usable(img.image_url)),
  ];

  // With the blank URLs filtered out, a venue can legitimately have no photos
  // at all — and this component read `allImages[0].image_url` unconditionally,
  // so it would now throw rather than render. One honest tile instead: the
  // page still needs something occupying the hero, and "no photos yet" beats
  // both a crash and a grey rectangle pretending to be a picture.
  if (allImages.length === 0) {
    return (
      <div className="flex aspect-[21/9] max-h-96 w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface-2">
        <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No photos yet</p>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const next = () => setSelectedIndex((i) => (i + 1) % allImages.length);
  const prev = () => setSelectedIndex((i) => (i - 1 + allImages.length) % allImages.length);

  const thumbnails = allImages.slice(1, 5);
  // Most venues carry a single image. The grid used to pad the empty slots with
  // four grey boxes, so the common case rendered ~500px of nothing dressed up
  // as a gallery. With nothing to show alongside it, the main image takes the
  // full width instead.
  const hasThumbnails = thumbnails.length > 0;

  const tileBase =
    "group relative overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  // At md and up the grid itself is a definite height (see below) and every
  // tile fills it. Below md there is one stacked image and the ratio governs.
  const tileClass = `${tileBase} aspect-[4/3] md:aspect-auto md:h-full md:w-full`;
  const thumbClass = `${tileBase} h-full w-full`;
  const imgClass =
    "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105";
  // One hero height for every venue, at md and up.
  //
  // It used to depend on the photo count: a venue with a single image got
  // `md:h-96` (384px), while one with thumbnails got a two-column grid of
  // `aspect-[4/3]` tiles, which at a 1360px container is 672px per column and
  // so 504px tall. The single most prominent element in the catalogue changed
  // height by 120px depending on how many photos an owner happened to upload,
  // and no loading skeleton could be right for both — which is how this was
  // found, by a skeleton measuring 69px off the thing it stood in for.
  //
  // A definite height here also makes `h-full` on the tiles legitimate. The
  // earlier attempt at `h-full` was circular *because the row was auto-sized*;
  // that is a different thing from filling a row whose height is stated.
  //
  // A full-width single image still needs a ceiling: at 21/9 across 1360px it
  // ran ~580px and pushed the venue name, price and booking panel below the
  // fold. `aspect-[21/9] max-h-96` was the wrong ceiling — an aspect ratio plus
  // a max height is satisfied by shrinking the *width*, so the tile came out
  // 896px wide inside a 1360px column with 464px of background beside it. A
  // plain height with object-cover crops instead, which is what was meant.
  // `md:grid-rows-1` is not decoration next to `md:h-96`. Tailwind emits
  // `repeat(1, minmax(0, 1fr))`, and both halves matter: the `1fr` makes the
  // row take the container's stated height, and the `minmax(0, …)` stops the
  // content from forcing it larger. Without it the row is `auto`, sizes to its
  // tallest child, and `h-full` on the tiles resolves against *that* — which
  // measured 672px tiles inside a 384px gallery at one, three, four and six
  // photos. Stating the container height is not enough; the row has to be
  // definite too.
  const galleryHeight = "md:h-96 md:grid-rows-1";

  return (
    <>
      <div className={cn("grid gap-4", galleryHeight, hasThumbnails && "md:grid-cols-2")}>
        {/* A real button, not a click-handled div: the gallery could not be
            reached by keyboard and announced as nothing to a screen reader. */}
        <button
          type="button"
          onClick={() => openLightbox(0)}
          aria-label={`View photos of ${venueName}`}
          className={tileClass}
        >
          <GalleryImage src={allImages[0].image_url} alt={venueName} className={imgClass} />
        </button>

        {hasThumbnails && (
          // The thumbnail column was always `grid-cols-2`, whatever it held.
          // Venues with one extra photo — the common case above zero — got a
          // quarter-filled column: one short 4:3 tile top-left, and roughly
          // 265px of nothing beside and below it, next to a 510px main image.
          // The column now takes its shape from how many photos there are, and
          // its height from the grid row, which is stated rather than derived.
          // An earlier fix gave it `aspect-[4/3]` to match the main tile by
          // construction; that was right while the row was auto-sized, and is
          // now redundant with — and would fight — the row's own height.
          <div
            className={cn(
              "hidden h-full gap-4 md:grid",
              thumbnails.length === 1 ? "grid-cols-1" : "grid-cols-2",
              thumbnails.length > 2 ? "grid-rows-2" : "grid-rows-1",
            )}
          >
            {thumbnails.map((img, i) => (
              <button
                type="button"
                key={img.id}
                onClick={() => openLightbox(i + 1)}
                aria-label={img.caption || `${venueName} photo ${i + 2}`}
                className={thumbClass}
              >
                <GalleryImage
                  src={img.image_url}
                  alt={img.caption || `${venueName} view ${i + 1}`}
                  className={imgClass}
                />
                {i === 3 && allImages.length > 5 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
                    +{allImages.length - 5} more
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        {/* Backdrop was bg-foreground/95 — near-white in this dark-first theme,
            so opening a photo flashed the screen. Chrome colours here are fixed
            light-on-dark because what sits behind them is always the dimmed
            photo, never a themed surface. */}
        <DialogContent className="max-w-4xl border-none bg-black/95 p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close photo viewer"
              className="absolute right-4 top-4 z-10 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>

            <div className="flex min-h-[60vh] items-center justify-center">
              {allImages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous photo"
                  className="absolute left-4 text-white hover:bg-white/20"
                  onClick={prev}
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </Button>
              )}

              <GalleryImage
                src={allImages[selectedIndex].image_url}
                alt={allImages[selectedIndex].caption || venueName}
                className="max-h-[80vh] max-w-full object-contain"
              />

              {allImages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next photo"
                  className="absolute right-4 text-white hover:bg-white/20"
                  onClick={next}
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </Button>
              )}
            </div>

            {allImages[selectedIndex].caption && (
              <div className="py-3 text-center">
                <p className="text-sm text-white/80">{allImages[selectedIndex].caption}</p>
              </div>
            )}

            {allImages.length > 1 && (
              <div className="flex justify-center gap-1 pb-4">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to photo ${i + 1}`}
                    aria-current={i === selectedIndex}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === selectedIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                    )}
                    onClick={() => setSelectedIndex(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VenueGallery;
