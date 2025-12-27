import { useState, useMemo } from 'react';
import { Search, Filter, Grid3X3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CDCard } from './CDCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CollectionGridProps {
  releases: any[];
  loading: boolean;
}

export function CollectionGrid({ releases, loading }: CollectionGridProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('added');
  const [genreFilter, setGenreFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get unique genres
  const genres = useMemo(() => {
    const allGenres = releases.flatMap(r => r.basic_information?.genres || []);
    return [...new Set(allGenres)].sort();
  }, [releases]);

  // Filter and sort releases
  const filteredReleases = useMemo(() => {
    let result = [...releases];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(r => {
        const title = r.basic_information?.title?.toLowerCase() || '';
        const artist = r.basic_information?.artists?.[0]?.name?.toLowerCase() || '';
        return title.includes(searchLower) || artist.includes(searchLower);
      });
    }

    // Genre filter
    if (genreFilter !== 'all') {
      result = result.filter(r => 
        r.basic_information?.genres?.includes(genreFilter)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'artist':
          return (a.basic_information?.artists?.[0]?.name || '').localeCompare(
            b.basic_information?.artists?.[0]?.name || ''
          );
        case 'title':
          return (a.basic_information?.title || '').localeCompare(
            b.basic_information?.title || ''
          );
        case 'year':
          return (b.basic_information?.year || 0) - (a.basic_information?.year || 0);
        case 'added':
        default:
          return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
      }
    });

    return result;
  }, [releases, search, sortBy, genreFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/50"
          />
        </div>
        
        <Select value={genreFilter} onValueChange={setGenreFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border/50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {genres.map(genre => (
              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[150px] bg-card border-border/50">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="added">Date Added</SelectItem>
            <SelectItem value="artist">Artist</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredReleases.length} of {releases.length} CDs
      </p>

      {/* Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredReleases.map((release, index) => (
            <div 
              key={release.instance_id || index}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
            >
              <CDCard
                title={release.basic_information?.title || 'Unknown'}
                artist={release.basic_information?.artists?.[0]?.name || 'Unknown Artist'}
                year={release.basic_information?.year || 0}
                coverImage={release.basic_information?.cover_image || release.basic_information?.thumb}
                genres={release.basic_information?.genres || []}
                styles={release.basic_information?.styles || []}
                label={release.basic_information?.labels?.[0]?.name}
                catalogNumber={release.basic_information?.labels?.[0]?.catno}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredReleases.map((release, index) => (
            <div 
              key={release.instance_id || index}
              className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border/30 hover:border-primary/30 transition-colors animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 20, 300)}ms` }}
            >
              <img
                src={release.basic_information?.thumb || '/placeholder.svg'}
                alt=""
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {release.basic_information?.title}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {release.basic_information?.artists?.[0]?.name}
                </p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm text-muted-foreground">
                  {release.basic_information?.year || '—'}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {release.basic_information?.genres?.[0]}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredReleases.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No CDs found matching your filters</p>
        </div>
      )}
    </div>
  );
}
