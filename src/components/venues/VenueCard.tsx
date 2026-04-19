import { Link } from "react-router-dom";
import { MapPin, Star, MessageCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";

interface VenueCardProps {
  id: string;
  name: string;
  image: string;
  location: string;
  sports: string[];
  price: number;
  rating: number;
  reviewCount: number;
  available: boolean;
  distance?: number | null;
  isPromoted?: boolean;
}

const VenueCard = ({
  id,
  name,
  image,
  location,
  sports,
  price,
  rating,
  reviewCount,
  available,
  distance,
  isPromoted,
}: VenueCardProps) => {
  return (
    <Link to={`/venue/${id}`} className="group block">
      <div className={`bg-card rounded-xl overflow-hidden border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${isPromoted ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {isPromoted && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground gap-1">
              <Sparkles className="h-3 w-3" />
              Featured
            </Badge>
          )}
          <Badge className="absolute top-3 right-3 bg-[#25D366] text-white border-0">
            <MessageCircle className="h-3 w-3 mr-1" />
            WhatsApp
          </Badge>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {name}
            </h3>
            <div className="flex items-center gap-1 text-sm shrink-0">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-medium text-foreground">{rating}</span>
              <span className="text-muted-foreground">({reviewCount})</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{location}</span>
            {distance !== undefined && distance !== null && (
              <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sports.slice(0, 3).map((sport) => (
              <Badge key={sport} variant="secondary" className="text-xs font-normal">
                {sport}
              </Badge>
            ))}
            {sports.length > 3 && (
              <Badge variant="secondary" className="text-xs font-normal">
                +{sports.length - 3}
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-foreground">{formatPrice(price)}</span>
            <span className="text-sm text-muted-foreground">/ hour</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VenueCard;
