import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Disc } from 'lucide-react';
import { Header } from '@/components/Header';
import { DiscogsConnect } from '@/components/DiscogsConnect';
import { CollectionStats } from '@/components/CollectionStats';
import { CollectionGrid } from '@/components/CollectionGrid';
import { CollectionCharts } from '@/components/CollectionCharts';
import { MostValuableCDs } from '@/components/MostValuableCDs';
import { AIAnalysis } from '@/components/AIAnalysis';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useDiscogs } from '@/hooks/useDiscogs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    allReleases,
    loading,
    discogsConnected,
    discogsUsername,
    collectionValue,
    initiateDiscogsAuth,
    fetchCollection,
    disconnectDiscogs,
  } = useDiscogs();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (discogsConnected) {
      fetchCollection();
    }
  }, [discogsConnected]);

  // Calculate stats
  const stats = useMemo(() => {
    const genres = allReleases.flatMap(r => r.basic_information?.genres || []);
    const decades: Record<string, number> = {};
    
    allReleases.forEach(r => {
      const year = r.basic_information?.year;
      if (year && year > 1900) {
        const decade = `${Math.floor(year / 10) * 10}s`;
        decades[decade] = (decades[decade] || 0) + 1;
      }
    });

    return { genres, decades };
  }, [allReleases]);

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
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* Hero Section */}
          <div className="text-center py-8">
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
              YOUR <span className="text-gradient">CD COLLECTION</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              Explore, analyze, and discover the value of your compact disc collection
            </p>
          </div>

          {/* Discogs Connection */}
          <DiscogsConnect
            connected={discogsConnected}
            username={discogsUsername}
            onConnect={initiateDiscogsAuth}
            onDisconnect={disconnectDiscogs}
          />

          {discogsConnected && (
            <>
              {/* Stats */}
              <CollectionStats
                totalCDs={allReleases.length}
                collectionValue={collectionValue}
                genres={stats.genres}
                decades={stats.decades}
              />

              {/* Tabs for Collection and Analysis */}
              <Tabs defaultValue="collection" className="space-y-6">
                <div className="flex items-center justify-between">
                  <TabsList className="bg-card border border-border/50">
                    <TabsTrigger value="collection" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Collection
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      Insights
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      AI Analysis
                    </TabsTrigger>
                  </TabsList>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchCollection()}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                <TabsContent value="collection" className="mt-6">
                  <CollectionGrid releases={allReleases} loading={loading} />
                </TabsContent>

                <TabsContent value="insights" className="mt-6 space-y-6">
                  <CollectionCharts releases={allReleases} />
                  <MostValuableCDs releases={allReleases} />
                </TabsContent>

                <TabsContent value="analysis" className="mt-6">
                  <AIAnalysis collection={allReleases} />
                </TabsContent>
              </Tabs>
            </>
          )}

          {!discogsConnected && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto stat-card p-8">
                <Disc className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                <h3 className="font-display text-xl mb-2">NO COLLECTION YET</h3>
                <p className="text-muted-foreground text-sm">
                  Connect your Discogs account above to start exploring your CD collection.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
