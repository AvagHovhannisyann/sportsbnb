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

  const allImages = [{ id: "main", image_url: mainImage, caption: venueName }, ...images];

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

  const tileClass =
    "group relative aspect-[4/3] overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const imgClass =
    "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105";
  // A full-width single image still needs a ceiling: at 21/9 across a 1360px
  // container it ran ~580px tall and pushed the venue name, price and booking
  // panel below the fold.
  const soloTileClass = "md:aspect-[21/9] md:max-h-[24rem]";

  return (
    <>
      <div className={cn("grid gap-4", hasThumbnails && "md:grid-cols-2")}>
        {/* A real button, not a click-handled div: the gallery could not be
            reached by keyboard and announced as nothing to a screen reader. */}
        <button
          type="button"
          onClick={() => openLightbox(0)}
          aria-label={`View photos of ${venueName}`}
          className={cn(tileClass, !hasThumbnails && soloTileClass)}
        >
          <GalleryImage src={allImages[0].image_url} alt={venueName} className={imgClass} />
        </button>

        {hasThumbnails && (
          <div className="hidden grid-cols-2 gap-4 md:grid">
            {thumbnails.map((img, i) => (
              <button
                type="button"
                key={img.id}
                onClick={() => openLightbox(i + 1)}
                aria-label={img.caption || `${venueName} photo ${i + 2}`}
                className={tileClass}
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
