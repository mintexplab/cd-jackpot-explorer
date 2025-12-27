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
    const { query, type = 'release', format = 'CD', page = 1, per_page = 20 } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [], pagination: { pages: 0, items: 0 } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Searching Discogs for:', query, 'type:', type, 'format:', format);

    // Build search URL with format filter for CDs
    const searchParams = new URLSearchParams({
      q: query,
      type: type,
      format: format,
      page: page.toString(),
      per_page: per_page.toString(),
    });

    const searchUrl = `https://api.discogs.com/database/search?${searchParams.toString()}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Discogs key=${DISCOGS_CONSUMER_KEY}, secret=${DISCOGS_CONSUMER_SECRET}`,
        'User-Agent': 'JackpotMusicCDExplorer/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discogs search error:', errorText);
      throw new Error(`Discogs API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform results to a cleaner format
    const results = data.results?.map((item: any) => ({
      id: item.id,
      title: item.title,
      year: item.year,
      country: item.country,
      format: item.format,
      label: item.label,
      genre: item.genre,
      style: item.style,
      cover_image: item.cover_image,
      thumb: item.thumb,
      resource_url: item.resource_url,
      master_url: item.master_url,
      uri: item.uri,
      type: item.type,
    })) || [];

    return new Response(JSON.stringify({
      results,
      pagination: data.pagination || { pages: 0, items: 0 },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Search failed',
      results: [],
      pagination: { pages: 0, items: 0 },
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});