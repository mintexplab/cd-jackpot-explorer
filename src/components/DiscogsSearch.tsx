import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Disc, Heart, ExternalLink, Loader2, X, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface Pagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
}

interface SearchFilters {
  yearFrom: string;
  yearTo: string;
  genre: string;
  country: string;
}

const GENRES = [
  'Rock', 'Electronic', 'Pop', 'Jazz', 'Classical', 'Hip Hop', 
  'R&B', 'Soul', 'Funk', 'Blues', 'Country', 'Reggae', 'Metal', 
  'Punk', 'Folk', 'World', 'Latin', 'Stage & Screen'
];

const COUNTRIES = [
  'US', 'UK', 'Germany', 'Japan', 'France', 'Italy', 'Canada', 
  'Netherlands', 'Australia', 'Spain', 'Sweden', 'Brazil'
];

export function DiscogsSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<SearchResult | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<SearchFilters>({
    yearFrom: '',
    yearTo: '',
    genre: '',
    country: ''
  });
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

  const searchDiscogs = useCallback(async (searchQuery: string, page: number = 1, searchFilters: SearchFilters = filters) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setPagination(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('discogs-search', {
        body: { 
          query: searchQuery, 
          format: 'CD', 
          per_page: 15,
          page,
          year_from: searchFilters.yearFrom || undefined,
          year_to: searchFilters.yearTo || undefined,
          genre: searchFilters.genre || undefined,
          country: searchFilters.country || undefined
        }
      });

      if (error) throw error;
      
      // Filter to only show CD formats (extra client-side filtering for safety)
      const cdResults = (data.results || []).filter((result: SearchResult) => {
        const formats = result.format || [];
        const formatStr = formats.join(' ').toLowerCase();
        const hasCD = formatStr.includes('cd');
        const hasVinyl = formatStr.includes('vinyl') || formatStr.includes('lp') || formatStr.includes('12"') || formatStr.includes('7"');
        const hasCassette = formatStr.includes('cassette') || formatStr.includes('tape');
        return hasCD || (!hasVinyl && !hasCassette && formats.length === 0);
      });
      
      setResults(cdResults);
      setPagination(data.pagination);
      setCurrentPage(page);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      searchDiscogs(value, 1, filters);
    }, 300);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (query.trim().length >= 2) {
      setCurrentPage(1);
      searchDiscogs(query, 1, newFilters);
    }
  };

  const clearFilters = () => {
    const emptyFilters = { yearFrom: '', yearTo: '', genre: '', country: '' };
    setFilters(emptyFilters);
    if (query.trim().length >= 2) {
      searchDiscogs(query, 1, emptyFilters);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!pagination || newPage <= pagination.pages)) {
      searchDiscogs(query, newPage, filters);
    }
  };

  const handleAddToWishlist = async (result: SearchResult) => {
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

  const parseTitle = (fullTitle: string) => {
    const parts = fullTitle.split(' - ');
    return {
      artist: parts.length > 1 ? parts[0] : 'Unknown Artist',
      title: parts.length > 1 ? parts.slice(1).join(' - ') : fullTitle
    };
  };

  const hasActiveFilters = filters.yearFrom || filters.yearTo || filters.genre || filters.country;

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
        <div className="flex gap-2">
          <div className="relative flex-1">
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
                  setPagination(null);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            className={cn("h-12 w-12", hasActiveFilters && !showFilters && "border-primary text-primary")}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-3 p-4 rounded-lg border border-border/50 bg-card space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Filter Results</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                  Clear all
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Year From */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Year from</label>
                <Input
                  type="number"
                  placeholder="1950"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={filters.yearFrom}
                  onChange={(e) => handleFilterChange('yearFrom', e.target.value)}
                  className="h-9 bg-background"
                />
              </div>

              {/* Year To */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Year to</label>
                <Input
                  type="number"
                  placeholder={new Date().getFullYear().toString()}
                  min="1900"
                  max={new Date().getFullYear()}
                  value={filters.yearTo}
                  onChange={(e) => handleFilterChange('yearTo', e.target.value)}
                  className="h-9 bg-background"
                />
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Genre</label>
                <Select value={filters.genre} onValueChange={(v) => handleFilterChange('genre', v)}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Any genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-[10000]">
                    <SelectItem value="">Any genre</SelectItem>
                    {GENRES.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Country</label>
                <Select value={filters.country} onValueChange={(v) => handleFilterChange('country', v)}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Any country" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-[10000]">
                    <SelectItem value="">Any country</SelectItem>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

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
            {/* Header with count and pagination info */}
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'hsl(25 20% 20%)' }}>
              <span className="text-sm font-medium text-primary">CDs</span>
              {pagination && (
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {pagination.pages} ({pagination.items} results)
                </span>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
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
                    <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden" style={{ backgroundColor: 'hsl(20 12% 15%)' }}>
                      {result.thumb ? (
                        <img src={result.thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

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

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddToWishlist(result)}
                        disabled={inWishlist}
                        className={cn("h-8 w-8", inWishlist && "text-red-500")}
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
            
            {/* Pagination Footer */}
            {pagination && pagination.pages > 1 && (
              <div 
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: '1px solid hsl(25 20% 20%)', backgroundColor: 'hsl(20 12% 8%)' }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="h-8"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                    let pageNum: number;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.pages || loading}
                  className="h-8"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
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
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="text-primary mt-2">
                Try clearing filters
              </Button>
            )}
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