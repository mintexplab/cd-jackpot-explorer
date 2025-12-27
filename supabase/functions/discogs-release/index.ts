import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCOGS_CONSUMER_KEY = Deno.env.get('DISCOGS_CONSUMER_KEY');
const DISCOGS_CONSUMER_SECRET = Deno.env.get('DISCOGS_CONSUMER_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { releaseId } = await req.json();
    
    if (!releaseId) {
      return new Response(JSON.stringify({ error: 'Release ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching Discogs release:', releaseId);

    const releaseUrl = `https://api.discogs.com/releases/${releaseId}`;
    
    const response = await fetch(releaseUrl, {
      headers: {
        'Authorization': `Discogs key=${DISCOGS_CONSUMER_KEY}, secret=${DISCOGS_CONSUMER_SECRET}`,
        'User-Agent': 'JackpotMusicCDExplorer/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discogs release error:', errorText);
      throw new Error(`Discogs API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Return relevant release data
    const releaseData = {
      id: data.id,
      title: data.title,
      artists_sort: data.artists_sort || data.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      year: data.year,
      genres: data.genres || [],
      styles: data.styles || [],
      labels: data.labels?.map((l: any) => ({ name: l.name, catno: l.catno })) || [],
      images: data.images?.map((img: any) => ({ uri: img.uri, type: img.type })) || [],
      tracklist: data.tracklist?.map((t: any) => ({
        position: t.position,
        title: t.title,
        duration: t.duration,
      })) || [],
      extraartists: data.extraartists?.map((a: any) => ({
        name: a.name,
        role: a.role,
      })) || [],
      country: data.country,
      notes: data.notes,
      uri: data.uri,
      community: data.community ? {
        have: data.community.have,
        want: data.community.want,
        rating: data.community.rating,
      } : null,
      lowest_price: data.lowest_price,
      num_for_sale: data.num_for_sale,
    };

    return new Response(JSON.stringify(releaseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Release fetch error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to fetch release',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
