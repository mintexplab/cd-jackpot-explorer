import { Disc, TrendingUp, Calendar, Tag, DollarSign, Music } from 'lucide-react';
import { StatCard } from './StatCard';

interface CollectionStatsProps {
  totalCDs: number;
  collectionValue: {
    minimum: string;
    median: string;
    maximum: string;
  } | null;
  genres: string[];
  decades: Record<string, number>;
}

export function CollectionStats({ totalCDs, collectionValue, genres, decades }: CollectionStatsProps) {
  // Get most common genre
  const topGenre = genres.length > 0 
    ? Object.entries(
        genres.reduce((acc, genre) => {
          acc[genre] = (acc[genre] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Various'
    : 'Various';

  // Get most common decade
  const topDecade = Object.entries(decades)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total CDs"
        value={totalCDs}
        subtitle="in your collection"
        icon={Disc}
      />
      
      {collectionValue && (
        <StatCard
          title="Median Value"
          value={collectionValue.median}
          subtitle={`Range: ${collectionValue.minimum} - ${collectionValue.maximum}`}
          icon={DollarSign}
        />
      )}

      <StatCard
        title="Top Genre"
        value={topGenre}
        subtitle={`${genres.filter(g => g === topGenre).length} CDs`}
        icon={Music}
      />

      {topDecade && (
        <StatCard
          title="Dominant Era"
          value={topDecade[0]}
          subtitle={`${topDecade[1]} CDs from this decade`}
          icon={Calendar}
        />
      )}
    </div>
  );
}
