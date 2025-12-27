import { useState, useEffect } from 'react';
import { Heart, Trash2, ExternalLink, Disc, ShoppingCart, Bell, BellOff, DollarSign, Loader2, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWishlist, WishlistItem } from '@/hooks/useWishlist';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PriceData {
  min_price: number | null;
  for_sale_count: number;
  suggested_price?: number;
  currency: string;
}

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
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [settingAlert, setSettingAlert] = useState(false);

  const fetchPrice = async () => {
    setLoadingPrice(true);
    try {
      const { data, error } = await supabase.functions.invoke('discogs-price', {
        body: { release_id: item.discogs_release_id }
      });

      if (error) throw error;
      setPriceData(data);
    } catch (error) {
      console.error('Failed to fetch price:', error);
    } finally {
      setLoadingPrice(false);
    }
  };

  const setAlert = async () => {
    if (!targetPrice || isNaN(parseFloat(targetPrice))) {
      toast.error('Please enter a valid price');
      return;
    }

    setSettingAlert(true);
    try {
      const { data, error } = await supabase.functions.invoke('discogs-price', {
        body: { 
          release_id: item.discogs_release_id,
          action: 'set_alert',
          wishlist_id: item.id,
          target_price: parseFloat(targetPrice)
        }
      });

      if (error) throw error;
      toast.success(`Alert set! You'll be notified when price drops below $${targetPrice}`);
      setAlertDialogOpen(false);
    } catch (error) {
      console.error('Failed to set alert:', error);
      toast.error('Failed to set price alert');
    } finally {
      setSettingAlert(false);
    }
  };

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
          {priceData && priceData.min_price && (
            <Badge variant="default" className="text-xs bg-green-600">
              From ${priceData.min_price.toFixed(2)}
            </Badge>
          )}
          {priceData && priceData.for_sale_count > 0 && (
            <span className="text-xs text-muted-foreground">
              {priceData.for_sale_count} for sale
            </span>
          )}
        </div>
      </div>

      {/* Price & Actions */}
      <div className="flex items-center gap-2">
        {/* Check Price Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchPrice}
          disabled={loadingPrice}
          className="gap-1 text-muted-foreground hover:text-green-500"
        >
          {loadingPrice ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <DollarSign className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {priceData ? 'Refresh' : 'Check Price'}
          </span>
        </Button>

        {/* Price Alert Dialog */}
        <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-primary"
            >
              <Bell className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary" />
                Set Price Alert
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Get notified when "{item.title}" drops below your target price.
                </p>
                {priceData?.min_price && (
                  <p className="text-sm">
                    Current lowest price: <span className="text-green-500 font-medium">${priceData.min_price.toFixed(2)}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="Enter target price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button 
                onClick={setAlert} 
                disabled={settingAlert}
                className="w-full"
              >
                {settingAlert ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Set Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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