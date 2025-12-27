import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Disc, Heart, ExternalLink, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';

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
}

export function DiscogsSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
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
        body: { query: searchQuery, format: 'CD', per_page: 10 }
      });

      if (error) throw error;
      setResults(data.results || []);
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

  const openOnDiscogs = (result: SearchResult) => {
    window.open(`https://www.discogs.com${result.uri}`, '_blank');
  };

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

        {/* Autocomplete Results */}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
            <div className="max-h-[400px] overflow-y-auto">
              {results.map((result) => {
                const parts = result.title.split(' - ');
                const artist = parts.length > 1 ? parts[0] : 'Unknown';
                const title = parts.length > 1 ? parts.slice(1).join(' - ') : result.title;
                const inWishlist = isInWishlist(result.id);

                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                  >
                    {/* Cover */}
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted/30">
                      {result.thumb ? (
                        <img src={result.thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{title}</p>
                      <p className="text-sm text-muted-foreground truncate">{artist}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {result.year && (
                          <Badge variant="secondary" className="text-xs">{result.year}</Badge>
                        )}
                        {result.genre?.[0] && (
                          <span className="text-xs text-muted-foreground/70">{result.genre[0]}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddToWishlist(result)}
                        disabled={inWishlist}
                        className={cn(
                          "h-9 w-9",
                          inWishlist && "text-red-500"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", inWishlist && "fill-current")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openOnDiscogs(result)}
                        className="h-9 w-9"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-3 bg-muted/30 border-t border-border/50 text-center">
              <a 
                href={`https://www.discogs.com/search/?q=${encodeURIComponent(query)}&format=CD`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View all results on Discogs Marketplace →
              </a>
            </div>
          </div>
        )}

        {showResults && query.length >= 2 && results.length === 0 && !loading && (
          <div className="absolute z-50 w-full mt-2 p-6 bg-card border border-border rounded-xl shadow-xl text-center animate-fade-in">
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