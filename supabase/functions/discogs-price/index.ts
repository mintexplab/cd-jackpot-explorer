import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCOGS_CONSUMER_KEY = Deno.env.get('DISCOGS_CONSUMER_KEY');
const DISCOGS_CONSUMER_SECRET = Deno.env.get('DISCOGS_CONSUMER_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { release_id, action, wishlist_id, target_price } = await req.json();
    
    if (!release_id) {
      throw new Error('Release ID required');
    }

    console.log('Checking price for release:', release_id);

    // Fetch price stats from Discogs marketplace
    const statsUrl = `https://api.discogs.com/marketplace/price_suggestions/${release_id}`;
    
    const response = await fetch(statsUrl, {
      headers: {
        'Authorization': `Discogs key=${DISCOGS_CONSUMER_KEY}, secret=${DISCOGS_CONSUMER_SECRET}`,
        'User-Agent': 'JackpotMusicCDExplorer/1.0',
      },
    });

    // If price suggestions aren't available, try to get marketplace stats
    let priceData: any = null;
    
    if (response.ok) {
      const suggestions = await response.json();
      // Find CD price suggestion
      const cdPrice = suggestions['Very Good Plus (VG+)'] || suggestions['Near Mint (NM or M-)'] || suggestions['Good Plus (G+)'];
      if (cdPrice) {
        priceData = {
          suggested_price: cdPrice.value,
          currency: cdPrice.currency,
        };
      }
    }

    // Also try marketplace listings endpoint
    const listingsUrl = `https://api.discogs.com/marketplace/listings?release_id=${release_id}&status=for+sale&format=CD&sort=price&sort_order=asc&per_page=5`;
    
    const listingsResponse = await fetch(listingsUrl, {
      headers: {
        'Authorization': `Discogs key=${DISCOGS_CONSUMER_KEY}, secret=${DISCOGS_CONSUMER_SECRET}`,
        'User-Agent': 'JackpotMusicCDExplorer/1.0',
      },
    });

    let listings: any[] = [];
    let minPrice = null;
    let forSaleCount = 0;

    if (listingsResponse.ok) {
      const listingsData = await listingsResponse.json();
      listings = listingsData.listings || [];
      forSaleCount = listingsData.pagination?.items || 0;
      
      if (listings.length > 0) {
        // Get minimum price
        const cdListings = listings.filter((l: any) => 
          l.release?.format?.toLowerCase().includes('cd')
        );
        if (cdListings.length > 0) {
          minPrice = cdListings[0].price?.value;
        } else if (listings.length > 0) {
          minPrice = listings[0].price?.value;
        }
      }
    }

    // If user wants to set up a price alert
    if (action === 'set_alert' && wishlist_id && target_price) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Authorization required to set alerts');
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        throw new Error('Invalid user token');
      }

      // Upsert price alert
      const { error: alertError } = await supabase
        .from('price_alerts')
        .upsert({
          user_id: user.id,
          wishlist_id: wishlist_id,
          discogs_release_id: release_id,
          target_price: target_price,
          last_checked_at: new Date().toISOString(),
          last_min_price: minPrice,
          currency: 'USD',
        }, {
          onConflict: 'wishlist_id',
        });

      if (alertError) {
        console.error('Failed to set alert:', alertError);
        throw new Error('Failed to set price alert');
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Price alert set successfully',
        current_min_price: minPrice,
        target_price: target_price,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      release_id,
      min_price: minPrice,
      for_sale_count: forSaleCount,
      suggested_price: priceData?.suggested_price,
      currency: priceData?.currency || 'USD',
      listings: listings.slice(0, 3).map((l: any) => ({
        price: l.price?.value,
        currency: l.price?.currency,
        condition: l.condition,
        sleeve_condition: l.sleeve_condition,
        ships_from: l.ships_from,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Price check error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Price check failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});