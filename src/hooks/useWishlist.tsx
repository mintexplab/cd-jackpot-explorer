import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface WishlistItem {
  id: string;
  user_id: string;
  discogs_release_id: number;
  title: string;
  artist: string;
  year: number | null;
  cover_image: string | null;
  thumb: string | null;
  genres: string[] | null;
  labels: string[] | null;
  notes: string | null;
  created_at: string;
}

export function useWishlist() {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [user, fetchWishlist]);

  const addToWishlist = async (item: {
    discogs_release_id: number;
    title: string;
    artist: string;
    year?: number;
    cover_image?: string;
    thumb?: string;
    genres?: string[];
    labels?: string[];
    notes?: string;
  }) => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return false;
    }

    try {
      // Check if already in wishlist
      const existing = wishlist.find(w => w.discogs_release_id === item.discogs_release_id);
      if (existing) {
        toast.info('Already in your wishlist');
        return false;
      }

      const { data, error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          discogs_release_id: item.discogs_release_id,
          title: item.title,
          artist: item.artist,
          year: item.year || null,
          cover_image: item.cover_image || null,
          thumb: item.thumb || null,
          genres: item.genres || null,
          labels: item.labels || null,
          notes: item.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setWishlist(prev => [data, ...prev]);
      toast.success('Added to wishlist');
      return true;
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      toast.error('Failed to add to wishlist');
      return false;
    }
  };

  const removeFromWishlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setWishlist(prev => prev.filter(w => w.id !== id));
      toast.success('Removed from wishlist');
      return true;
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove');
      return false;
    }
  };

  const isInWishlist = (discogsReleaseId: number) => {
    return wishlist.some(w => w.discogs_release_id === discogsReleaseId);
  };

  return {
    wishlist,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist: fetchWishlist,
  };
}