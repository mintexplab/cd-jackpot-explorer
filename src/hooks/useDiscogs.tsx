import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface DiscogsRelease {
  id: number;
  instance_id: number;
  date_added: string;
  basic_information: {
    id: number;
    title: string;
    year: number;
    thumb: string;
    cover_image: string;
    artists: Array<{ name: string; id: number }>;
    genres: string[];
    styles: string[];
    formats: Array<{ name: string; qty: string; descriptions?: string[] }>;
    labels: Array<{ name: string; catno: string }>;
  };
}

interface CollectionData {
  releases: DiscogsRelease[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  value: {
    minimum: string;
    median: string;
    maximum: string;
  } | null;
  discogs_username: string;
}

interface Profile {
  discogs_username: string | null;
  discogs_oauth_token: string | null;
}

export function useDiscogs() {
  const { session, user } = useAuth();
  const [collection, setCollection] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [discogsConnected, setDiscogsConnected] = useState(false);
  const [discogsUsername, setDiscogsUsername] = useState<string | null>(null);
  const [collectionValue, setCollectionValue] = useState<CollectionData['value']>(null);
  const [pagination, setPagination] = useState<CollectionData['pagination'] | null>(null);
  const [allReleases, setAllReleases] = useState<DiscogsRelease[]>([]);

  useEffect(() => {
    if (user) {
      checkDiscogsConnection();
    }
  }, [user]);

  const checkDiscogsConnection = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('discogs_username, discogs_oauth_token')
      .eq('id', user.id)
      .single();

    if (data && data.discogs_oauth_token) {
      setDiscogsConnected(true);
      setDiscogsUsername(data.discogs_username);
    } else {
      setDiscogsConnected(false);
      setDiscogsUsername(null);
    }
  };

  const initiateDiscogsAuth = async () => {
    try {
      const callbackUrl = `${window.location.origin}/discogs-callback`;
      
      const { data, error } = await supabase.functions.invoke('discogs-auth', {
        body: { 
          action: 'request_token',
          callback_url: callbackUrl
        }
      });

      if (error) throw error;

      // Store token secret temporarily
      sessionStorage.setItem('discogs_token_secret', data.oauth_token_secret);
      
      // Redirect to Discogs authorization
      window.location.href = data.authorize_url;
    } catch (error) {
      console.error('Discogs auth error:', error);
      toast.error('Failed to connect to Discogs');
    }
  };

  const completeDiscogsAuth = async (oauthToken: string, oauthVerifier: string) => {
    try {
      const tokenSecret = sessionStorage.getItem('discogs_token_secret');
      
      const { data, error } = await supabase.functions.invoke('discogs-auth', {
        body: { 
          action: 'access_token',
          oauth_token: oauthToken,
          oauth_verifier: oauthVerifier,
          oauth_token_secret: tokenSecret
        }
      });

      if (error) throw error;

      sessionStorage.removeItem('discogs_token_secret');
      
      setDiscogsConnected(true);
      setDiscogsUsername(data.discogs_username);
      toast.success(`Connected to Discogs as ${data.discogs_username}`);
      
      return true;
    } catch (error) {
      console.error('Discogs auth completion error:', error);
      toast.error('Failed to complete Discogs authentication');
      return false;
    }
  };

  const fetchCollection = async (page: number = 1) => {
    if (!session) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('discogs-collection', {
        body: { page, per_page: 100 }
      });

      if (error) throw error;

      if (data.needs_auth) {
        setDiscogsConnected(false);
        return;
      }

      setCollection(data.releases);
      setPagination(data.pagination);
      setCollectionValue(data.value);
      setDiscogsUsername(data.discogs_username);

      // Fetch all pages for complete collection
      if (data.pagination.pages > 1 && page === 1) {
        await fetchAllPages(data.releases, data.pagination.pages);
      } else if (page === 1) {
        setAllReleases(data.releases);
      }
    } catch (error) {
      console.error('Collection fetch error:', error);
      toast.error('Failed to fetch collection');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPages = async (firstPageReleases: DiscogsRelease[], totalPages: number) => {
    const allData: DiscogsRelease[] = [...firstPageReleases];
    
    for (let page = 2; page <= Math.min(totalPages, 10); page++) {
      try {
        const { data, error } = await supabase.functions.invoke('discogs-collection', {
          body: { page, per_page: 100 }
        });

        if (!error && data.releases) {
          allData.push(...data.releases);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.error(`Error fetching page ${page}:`, e);
      }
    }

    setAllReleases(allData);
  };

  const disconnectDiscogs = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        discogs_username: null,
        discogs_oauth_token: null,
        discogs_oauth_token_secret: null,
      })
      .eq('id', user.id);

    if (!error) {
      setDiscogsConnected(false);
      setDiscogsUsername(null);
      setCollection([]);
      setAllReleases([]);
      toast.success('Disconnected from Discogs');
    }
  };

  return {
    collection,
    allReleases,
    loading,
    discogsConnected,
    discogsUsername,
    collectionValue,
    pagination,
    initiateDiscogsAuth,
    completeDiscogsAuth,
    fetchCollection,
    disconnectDiscogs,
    checkDiscogsConnection,
  };
}
