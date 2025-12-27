import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Disc, Search as SearchIcon } from 'lucide-react';
import { Header } from '@/components/Header';
import { DiscogsSearch } from '@/components/DiscogsSearch';
import { WishlistGrid } from '@/components/WishlistGrid';
import { useAuth } from '@/hooks/useAuth';

export default function Marketplace() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Disc className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          {/* Hero Section */}
          <div className="text-center py-8">
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
              DISCOVER <span className="text-gradient">NEW CDS</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              Search the Discogs marketplace to find CDs and add them to your wishlist
            </p>
          </div>

          {/* Search */}
          <div className="stat-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <SearchIcon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-xl tracking-wide">SEARCH DISCOGS</h2>
            </div>
            <DiscogsSearch />
          </div>

          {/* Wishlist */}
          <WishlistGrid />
        </div>
      </main>
    </div>
  );
}