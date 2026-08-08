import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
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
  ].filter(
    (image, index, collection) =>
      collection.findIndex((candidate) => candidate.image_url === image.image_url) === index,
  );

  // With the blank URLs filtered out, a venue can legitimately have no photos
  // at all — and this component read `allImages[0].image_url` unconditionally,
  // so it would now throw rather than render. One honest tile instead: the
  // page still needs something occupying the hero, and "no photos yet" beats
  // both a crash and a grey rectangle pretending to be a picture.
  if (allImages.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-1 md:h-96 md:aspect-auto">
        <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No photos yet</p>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const next = () => {
    setSelectedIndex((i) => (i + 1) % allImages.length);
  };
  const prev = () => {
    setSelectedIndex((i) => (i - 1 + allImages.length) % allImages.length);
  };
  const goTo = (i: number) => {
    setSelectedIndex(i);
  };

  const thumbnails = allImages.slice(1, 5);
  // Most venues carry a single image. The grid used to pad the empty slots with
  // four grey boxes, so the common case rendered ~500px of nothing dressed up
  // as a gallery. With nothing to show alongside it, the main image takes the
  // full width instead.
  const hasThumbnails = thumbnails.length > 0;

  const tileBase =
    "group relative min-h-11 overflow-hidden rounded-xl bg-surface-1 outline-none transition-opacity duration-150 motion-reduce:transition-none hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  // At md and up the grid itself is a definite height (see below) and every
  // tile fills it. Below md there is one stacked image and the ratio governs.
  const tileClass = `${tileBase} aspect-[4/3] md:aspect-auto md:h-full md:w-full`;
  const thumbClass = `${tileBase} h-full w-full`;
  const imgClass = "h-full w-full object-cover";
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
          <span className="absolute bottom-3 right-3 rounded-full border border-white/60 bg-black/65 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
            {allImages.length} {allImages.length === 1 ? "photo" : "photos"}
          </span>
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
        <DialogContent className="h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-5xl gap-0 overflow-hidden border-none bg-black/95 p-0 pr-0 text-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] [&>button]:right-2 [&>button]:top-2 [&>button]:z-20 [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white">
          <DialogTitle className="sr-only">Photos of {venueName}</DialogTitle>
          <DialogDescription className="sr-only">
            Browse {allImages.length} {allImages.length === 1 ? "photo" : "photos"} of this venue.
          </DialogDescription>
          <div className="relative flex h-full min-h-0 flex-col">

            <div className="flex min-h-0 flex-1 items-center justify-center px-12 py-12 sm:min-h-[60vh] sm:px-16">
              {allImages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous photo"
                  className="absolute left-1 z-10 h-11 w-11 bg-black/35 text-white hover:bg-white/15 sm:left-3"
                  onClick={prev}
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </Button>
              )}

              {/* Keyed on the index so GalleryImage gets fresh failure state
                  for every photo. A broken image must not hide the one after
                  it when the lightbox advances. */}
              <div
                key={selectedIndex}
                className="flex h-full min-w-0 max-w-full items-center justify-center"
              >
                <GalleryImage
                  src={allImages[selectedIndex].image_url}
                  alt={allImages[selectedIndex].caption || venueName}
                  className="max-h-[75dvh] max-w-full object-contain"
                />
              </div>

              {allImages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next photo"
                  className="absolute right-1 z-10 h-11 w-11 bg-black/35 text-white hover:bg-white/15 sm:right-3"
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
              // The pill that marks the current photo used to grow from 6px
              // to 24px through a broad transition, which animated `width` — a
              // layout property, so every dot after it was re-laid-out on
              // each frame of a transition whose whole purpose is decorative.
              // Same two sizes, reached by scaling a 24px pill down to a
              // quarter, which the compositor does for free. The colour step
              // rides along as opacity for the same reason.
              //
              // The button around each marker is a full touch target. The
              // visible pill remains compact while the control stays easy to
              // operate with touch, keyboard, or larger text settings.
              <div className="flex max-w-full justify-start gap-0.5 overflow-x-auto px-3 pb-2 sm:justify-center">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to photo ${i + 1}`}
                    aria-current={i === selectedIndex}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    onClick={() => goTo(i)}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 w-6 rounded-full bg-white",
                        "transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none",
                        i === selectedIndex ? "scale-x-100 opacity-100" : "scale-x-[0.25] opacity-40",
                      )}
                    />
                  </button>
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
