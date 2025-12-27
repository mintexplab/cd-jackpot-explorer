import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, ExternalLink, ShoppingCart, Disc, Loader2, Clock, Users, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Track {
  position: string;
  title: string;
  duration: string;
}

interface Artist {
  name: string;
  role?: string;
}

interface ReleaseData {
  id: number;
  title: string;
  artists_sort: string;
  year: number;
  genres: string[];
  styles: string[];
  labels: { name: string; catno: string }[];
  images: { uri: string; type: string }[];
  tracklist: Track[];
  extraartists?: Artist[];
  country: string;
  notes?: string;
  uri: string;
  community?: {
    have: number;
    want: number;
    rating: { average: number; count: number };
  };
  lowest_price?: number;
  num_for_sale?: number;
}

interface ReleaseDetailProps {
  releaseId: number;
  onBack: () => void;
  onAddToWishlist: () => void;
  isInWishlist: boolean;
}

export function ReleaseDetail({ releaseId, onBack, onAddToWishlist, isInWishlist }: ReleaseDetailProps) {
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelease = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('discogs-release', {
          body: { releaseId }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        setRelease(data);
      } catch (err) {
        console.error('Failed to fetch release:', err);
        setError('Failed to load release details');
      } finally {
        setLoading(false);
      }
    };

    fetchRelease();
  }, [releaseId]);

  const openOnDiscogs = () => {
    if (release?.uri) {
      window.open(`https://www.discogs.com${release.uri}`, '_blank');
    }
  };

  const openMarketplace = () => {
    window.open(`https://www.discogs.com/sell/release/${releaseId}?format=CD`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading release details...</p>
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="text-center py-12">
        <Disc className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">{error || 'Release not found'}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to search
        </Button>
      </div>
    );
  }

  const coverImage = release.images?.find(img => img.type === 'primary')?.uri || release.images?.[0]?.uri;
  const primaryLabel = release.labels?.[0];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </Button>

      {/* Main info section - similar to Discogs layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Cover Image */}
        <div className="flex-shrink-0">
          <div className="w-full md:w-48 aspect-square rounded-lg overflow-hidden bg-muted/30">
            {coverImage ? (
              <img src={coverImage} alt={release.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
          </div>
        </div>

        {/* Release info */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {release.artists_sort} – {release.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {release.genres?.length > 0 && (
                <span><span className="text-foreground/70">Genre:</span> {release.genres.join(', ')}</span>
              )}
              {release.styles?.length > 0 && (
                <span><span className="text-foreground/70">Style:</span> {release.styles.join(', ')}</span>
              )}
              {release.year && (
                <span><span className="text-foreground/70">Year:</span> {release.year}</span>
              )}
            </div>
          </div>

          {/* Label info */}
          {primaryLabel && (
            <div className="text-sm">
              <span className="text-muted-foreground">Label: </span>
              <span className="text-primary">{primaryLabel.name}</span>
              {primaryLabel.catno && (
                <span className="text-muted-foreground"> – {primaryLabel.catno}</span>
              )}
            </div>
          )}

          {/* Country */}
          {release.country && (
            <div className="text-sm">
              <span className="text-muted-foreground">Country: </span>
              <span>{release.country}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={onAddToWishlist}
              disabled={isInWishlist}
              className={cn(
                "gap-2",
                isInWishlist && "bg-red-500/20 text-red-400 border-red-500/30"
              )}
              variant={isInWishlist ? "outline" : "default"}
            >
              <Heart className={cn("w-4 h-4", isInWishlist && "fill-current")} />
              {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            </Button>
            <Button variant="outline" onClick={openMarketplace} className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Shop Listings
              {release.num_for_sale && <Badge variant="secondary" className="ml-1">{release.num_for_sale}</Badge>}
            </Button>
            <Button variant="ghost" onClick={openOnDiscogs} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              View on Discogs
            </Button>
          </div>
        </div>

        {/* Stats sidebar - like Discogs right column */}
        <div className="md:w-52 space-y-4">
          {/* For Sale box */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(20 12% 12%)', border: '1px solid hsl(25 20% 20%)' }}>
            <p className="text-xs text-muted-foreground uppercase mb-1">For Sale</p>
            <p className="text-lg font-semibold text-foreground">
              {release.num_for_sale ? `${release.num_for_sale} listings` : 'Check Discogs'}
            </p>
            {release.lowest_price && (
              <p className="text-sm text-muted-foreground">From ${release.lowest_price.toFixed(2)}</p>
            )}
            <Button 
              variant="default" 
              size="sm" 
              className="w-full mt-3 bg-primary hover:bg-primary/90"
              onClick={openMarketplace}
            >
              Shop Listings
            </Button>
          </div>

          {/* Statistics */}
          {release.community && (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(20 12% 12%)', border: '1px solid hsl(25 20% 20%)' }}>
              <p className="text-xs text-muted-foreground uppercase mb-3">Statistics</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Have</span>
                  <span className="text-primary">{release.community.have?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Want</span>
                  <span className="text-primary">{release.community.want?.toLocaleString()}</span>
                </div>
                {release.community.rating?.average > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Rating</span>
                    <span>{release.community.rating.average.toFixed(2)} / 5</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tracklist */}
      {release.tracklist && release.tracklist.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(20 12% 10%)', border: '1px solid hsl(25 20% 20%)' }}>
          <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Tracklist
          </h3>
          <div className="space-y-1">
            {release.tracklist.map((track, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/20 transition-colors"
                style={{ borderBottom: '1px solid hsl(25 20% 15%)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm w-8">{track.position || index + 1}</span>
                  <span className="text-foreground">{track.title}</span>
                </div>
                {track.duration && (
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {track.duration}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credits */}
      {release.extraartists && release.extraartists.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(20 12% 10%)', border: '1px solid hsl(25 20% 20%)' }}>
          <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Credits
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {release.extraartists.slice(0, 12).map((artist, index) => (
              <div key={index} className="text-sm">
                <span className="text-primary">{artist.name}</span>
                {artist.role && <span className="text-muted-foreground"> – {artist.role}</span>}
              </div>
            ))}
          </div>
          {release.extraartists.length > 12 && (
            <p className="text-sm text-muted-foreground mt-3">
              + {release.extraartists.length - 12} more credits
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {release.notes && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(20 12% 10%)', border: '1px solid hsl(25 20% 20%)' }}>
          <h3 className="font-display text-lg font-semibold mb-3">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{release.notes}</p>
        </div>
      )}
    </div>
  );
}
