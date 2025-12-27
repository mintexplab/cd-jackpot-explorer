import { Disc, Calendar, Music2 } from 'lucide-react';

interface CDCardProps {
  title: string;
  artist: string;
  year: number;
  coverImage: string;
  genres: string[];
  styles: string[];
  label?: string;
  catalogNumber?: string;
}

export function CDCard({ 
  title, 
  artist, 
  year, 
  coverImage, 
  genres, 
  styles,
  label,
  catalogNumber 
}: CDCardProps) {
  return (
    <div className="cd-item group">
      <div className="relative aspect-square overflow-hidden">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={`${title} by ${artist}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <Disc className="w-16 h-16 text-muted-foreground animate-spin-slow" />
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {genres.slice(0, 3).map((genre) => (
                <span 
                  key={genre} 
                  className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          {label && (
            <p className="text-xs text-muted-foreground truncate">
              {label} {catalogNumber && `• ${catalogNumber}`}
            </p>
          )}
        </div>

        {/* Vinyl/CD decoration */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-vinyl-black border-2 border-primary/50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
          <Music2 className="w-3.5 h-3.5" />
          {artist}
        </p>
        {year > 0 && (
          <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {year}
          </p>
        )}
      </div>
    </div>
  );
}
