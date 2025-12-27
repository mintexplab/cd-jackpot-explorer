import { Heart, Trash2, ExternalLink, Disc, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWishlist, WishlistItem } from '@/hooks/useWishlist';

export function WishlistGrid() {
  const { wishlist, loading, removeFromWishlist } = useWishlist();

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted/20 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto stat-card p-8">
          <Heart className="w-16 h-16 text-primary/30 mx-auto mb-4" />
          <h3 className="font-display text-xl mb-2">YOUR WISHLIST IS EMPTY</h3>
          <p className="text-muted-foreground text-sm">
            Search for CDs above and click the heart icon to add them to your wishlist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-xl tracking-wide flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          YOUR WISHLIST
          <Badge variant="secondary" className="ml-2">{wishlist.length}</Badge>
        </h3>
      </div>

      <div className="grid gap-4">
        {wishlist.map((item) => (
          <WishlistCard key={item.id} item={item} onRemove={removeFromWishlist} />
        ))}
      </div>
    </div>
  );
}

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: (id: string) => void }) {
  const openOnDiscogs = () => {
    window.open(`https://www.discogs.com/release/${item.discogs_release_id}`, '_blank');
  };

  const openMarketplace = () => {
    window.open(`https://www.discogs.com/sell/release/${item.discogs_release_id}?format=CD`, '_blank');
  };

  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-border/30 hover:border-primary/30 transition-all duration-300 animate-fade-in">
      {/* Cover */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted/30">
        {item.cover_image || item.thumb ? (
          <img 
            src={item.cover_image || item.thumb || ''} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc className="w-8 h-8 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate text-lg">{item.title}</p>
        <p className="text-muted-foreground truncate">{item.artist}</p>
        <div className="flex items-center gap-2 mt-2">
          {item.year && (
            <Badge variant="secondary" className="text-xs">{item.year}</Badge>
          )}
          {item.genres?.[0] && (
            <Badge variant="outline" className="text-xs">{item.genres[0]}</Badge>
          )}
          {item.labels?.[0] && (
            <span className="text-xs text-muted-foreground/70 truncate">{item.labels[0]}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          onClick={openMarketplace}
          className="gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          Buy
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={openOnDiscogs}
          className="h-9 w-9"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}