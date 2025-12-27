import { Disc3, ExternalLink, Check, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiscogsConnectProps {
  connected: boolean;
  username: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function DiscogsConnect({ connected, username, onConnect, onDisconnect }: DiscogsConnectProps) {
  if (connected) {
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Connected to Discogs</p>
              <p className="font-display text-xl text-foreground tracking-wide">@{username}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDisconnect}
            className="text-muted-foreground hover:text-destructive"
          >
            <Unlink className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card border-dashed border-2 border-primary/30">
      <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
        <div className="p-4 rounded-2xl bg-primary/10 animate-pulse-glow">
          <Disc3 className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center sm:text-left flex-1">
          <h3 className="font-display text-2xl text-foreground tracking-wide">
            CONNECT YOUR DISCOGS
          </h3>
          <p className="text-muted-foreground mt-2">
            Link your Discogs account to view and analyze your CD collection.
            We'll only access your collection data.
          </p>
        </div>
        <Button variant="hero" size="lg" onClick={onConnect} className="gap-2">
          <ExternalLink className="w-5 h-5" />
          Connect Discogs
        </Button>
      </div>
    </div>
  );
}
