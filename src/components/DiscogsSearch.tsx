import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Disc, Heart, ExternalLink, Loader2, X, ArrowLeft, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';
import { ReleaseDetail } from './ReleaseDetail';

interface SearchResult {
  id: number;
  title: string;
  year?: number;
  country?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
  cover_image?: string;
  thumb?: string;
  uri?: string;
  type: string;
  master_url?: string;
}

export function DiscogsSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<SearchResult | null>(null);
  const { addToWishlist, isInWishlist } = useWishlist();
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchDiscogs = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('discogs-search', {
        body: { query: searchQuery, format: 'CD', per_page: 15 }
      });

      if (error) throw error;
      
      // Filter to only show CD formats (extra client-side filtering for safety)
      const cdResults = (data.results || []).filter((result: SearchResult) => {
        const formats = result.format || [];
        const formatStr = formats.join(' ').toLowerCase();
        // Include if it contains CD and doesn't contain vinyl or cassette
        const hasCD = formatStr.includes('cd');
        const hasVinyl = formatStr.includes('vinyl') || formatStr.includes('lp') || formatStr.includes('12"') || formatStr.includes('7"');
        const hasCassette = formatStr.includes('cassette') || formatStr.includes('tape');
        return hasCD || (!hasVinyl && !hasCassette && formats.length === 0);
      });
      
      setResults(cdResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      searchDiscogs(value);
    }, 300);
  };

  const handleAddToWishlist = async (result: SearchResult) => {
    // Parse artist from title (Discogs format: "Artist - Title")
    const parts = result.title.split(' - ');
    const artist = parts.length > 1 ? parts[0] : 'Unknown Artist';
    const title = parts.length > 1 ? parts.slice(1).join(' - ') : result.title;

    await addToWishlist({
      discogs_release_id: result.id,
      title: title,
      artist: artist,
      year: result.year,
      cover_image: result.cover_image,
      thumb: result.thumb,
      genres: result.genre,
      labels: result.label,
    });
  };

  const handleSelectRelease = (result: SearchResult) => {
    setSelectedRelease(result);
    setShowResults(false);
  };

  const openOnDiscogs = (result: SearchResult) => {
    window.open(`https://www.discogs.com${result.uri}`, '_blank');
  };

  // Parse artist and title from Discogs format
  const parseTitle = (fullTitle: string) => {
    const parts = fullTitle.split(' - ');
    return {
      artist: parts.length > 1 ? parts[0] : 'Unknown Artist',
      title: parts.length > 1 ? parts.slice(1).join(' - ') : fullTitle
    };
  };

  // If a release is selected, show the detail view
  if (selectedRelease) {
    return (
      <ReleaseDetail
        releaseId={selectedRelease.id}
        onBack={() => setSelectedRelease(null)}
        onAddToWishlist={() => handleAddToWishlist(selectedRelease)}
        isInWishlist={isInWishlist(selectedRelease.id)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search for CDs on Discogs..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="pl-12 pr-12 h-12 text-lg bg-card border-border/50 focus:border-primary/50"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
          )}
          {!loading && query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowResults(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Autocomplete Results - Discogs Style */}
        {showResults && results.length > 0 && (
          <div 
            className="absolute left-0 right-0 z-[9999] mt-2 rounded-lg overflow-hidden animate-fade-in"
            style={{ 
              backgroundColor: 'hsl(20 12% 10%)',
              border: '1px solid hsl(25 20% 25%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              top: '100%'
            }}
          >
            {/* Category tabs like Discogs */}
            <div className="flex gap-4 px-4 py-2 border-b" style={{ borderColor: 'hsl(25 20% 20%)' }}>
              <span className="text-sm font-medium text-primary border-b-2 border-primary pb-1">CDs</span>
            </div>

            <div className="max-h-[450px] overflow-y-auto">
              {results.map((result) => {
                const { artist, title } = parseTitle(result.title);
                const inWishlist = isInWishlist(result.id);
                const formatInfo = result.format?.join(', ') || 'CD';

                return (
                  <div
                    key={result.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40"
                    style={{ borderBottom: '1px solid hsl(25 20% 15%)' }}
                    onClick={() => handleSelectRelease(result)}
                  >
                    {/* Cover */}
                    <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden" style={{ backgroundColor: 'hsl(20 12% 15%)' }}>
                      {result.thumb ? (
                        <img src={result.thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Info - Discogs style */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary hover:underline truncate">{title}</p>
                      <p className="text-sm text-foreground/80 truncate">{artist}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Disc className="w-3 h-3" />
                        <span>{formatInfo}</span>
                        {result.year && (
                          <>
                            <span>•</span>
                            <span>{result.year}</span>
                          </>
                        )}
                        {result.country && (
                          <>
                            <span>•</span>
                            <span>{result.country}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddToWishlist(result)}
                        disabled={inWishlist}
                        className={cn(
                          "h-8 w-8",
                          inWishlist && "text-red-500"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", inWishlist && "fill-current")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openOnDiscogs(result)}
                        className="h-8 w-8"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* View all results footer */}
            <a 
              href={`https://www.discogs.com/search/?q=${encodeURIComponent(query)}&format=CD`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
              style={{ borderTop: '1px solid hsl(25 20% 20%)', backgroundColor: 'hsl(20 12% 8%)' }}
            >
              <span className="text-muted-foreground">View all results</span>
              <span className="text-primary">→</span>
            </a>
          </div>
        )}

        {/* No results state */}
        {showResults && query.length >= 2 && results.length === 0 && !loading && (
          <div 
            className="absolute left-0 right-0 z-[9999] mt-2 p-6 rounded-lg text-center animate-fade-in"
            style={{ 
              backgroundColor: 'hsl(20 12% 10%)',
              border: '1px solid hsl(25 20% 25%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              top: '100%'
            }}
          >
            <Disc className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground">No CDs found for "{query}"</p>
            <a 
              href={`https://www.discogs.com/search/?q=${encodeURIComponent(query)}&format=CD`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Try searching on Discogs directly
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
