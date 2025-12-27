import { useMemo } from 'react';
import { TrendingUp, Disc, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MostValuableCDsProps {
  releases: any[];
}

export function MostValuableCDs({ releases }: MostValuableCDsProps) {
  // Note: Discogs API doesn't provide value data per release in collection endpoint
  // We'll highlight rare/notable items based on other criteria
  const notableReleases = useMemo(() => {
    // Sort by year (older = potentially more valuable) and take top items
    return [...releases]
      .filter(r => r.basic_information?.year && r.basic_information.year > 1900)
      .sort((a, b) => {
        // Prioritize older releases and those with fewer styles (often more rare)
        const yearA = a.basic_information?.year || 2000;
        const yearB = b.basic_information?.year || 2000;
        return yearA - yearB;
      })
      .slice(0, 6);
  }, [releases]);

  if (releases.length === 0 || notableReleases.length === 0) {
    return null;
  }

  return (
    <div className="stat-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gold/20">
            <TrendingUp className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-display text-xl tracking-wide">VINTAGE GEMS</h3>
            <p className="text-sm text-muted-foreground">Oldest releases in your collection</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {notableReleases.map((release, index) => {
          const info = release.basic_information;
          const year = info?.year;
          const title = info?.title || 'Unknown';
          const artist = info?.artists?.[0]?.name || 'Unknown Artist';
          const coverImage = info?.cover_image || info?.thumb;
          const label = info?.labels?.[0]?.name;
          const catno = info?.labels?.[0]?.catno;
          
          return (
            <div 
              key={release.instance_id || index}
              className="group relative flex gap-4 p-4 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/30 hover:border-gold/30 transition-all duration-300"
            >
              {/* Rank badge */}
              <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gold text-vinyl-black text-xs font-bold flex items-center justify-center shadow-lg">
                {index + 1}
              </div>
              
              {/* Cover */}
              <div className="relative w-16 h-16 flex-shrink-0">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={title}
                    className="w-full h-full object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-full h-full rounded-lg bg-muted/30 flex items-center justify-center">
                    <Disc className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate leading-tight">
                  {title}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {artist}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs bg-gold/10 text-gold border-gold/20">
                    {year}
                  </Badge>
                  {label && (
                    <span className="text-xs text-muted-foreground/70 truncate">
                      {label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground/60 mt-4 text-center">
        💡 Tip: Check Discogs marketplace for current market values
      </p>
    </div>
  );
}