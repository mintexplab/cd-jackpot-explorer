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

function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

async function generateSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureBase));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function makeDiscogsRequest(
  url: string,
  oauthToken: string,
  oauthTokenSecret: string
) {
  const nonce = generateNonce();
  const timestamp = generateTimestamp();

  // Parse URL to get base and query params
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
  
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: DISCOGS_CONSUMER_KEY!,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: oauthToken,
  };

  // Include query params in signature
  const allParams = { ...oauthParams };
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  const signature = await generateSignature(
    'GET',
    baseUrl,
    allParams,
    DISCOGS_CONSUMER_SECRET!,
    oauthTokenSecret
  );

  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  const response = await fetch(url, {
    headers: {
      'Authorization': authHeader,
      'User-Agent': 'JackpotMusicCDExplorer/1.0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Discogs API error:', response.status, errorText);
    throw new Error(`Discogs API error: ${response.status}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({
        error: 'Authorization required',
        needs_auth: true,
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('User auth error:', userError?.message);
      return new Response(JSON.stringify({
        error: 'Invalid user token',
        needs_auth: true,
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Get user's Discogs credentials
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('discogs_username, discogs_oauth_token, discogs_oauth_token_secret')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError.message);
    }

    console.log('Profile found:', !!profile, 'Has token:', !!profile?.discogs_oauth_token);

    if (!profile?.discogs_oauth_token) {
      console.log('Discogs not connected for user');
      return new Response(JSON.stringify({ 
        error: 'Discogs not connected',
        needs_auth: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { page = 1, per_page = 50, sort = 'added', sort_order = 'desc' } = await req.json();

    console.log(`Fetching collection for ${profile.discogs_username}, page ${page}`);

    // Fetch collection - ALL releases first, then filter
    const collectionUrl = `https://api.discogs.com/users/${profile.discogs_username}/collection/folders/0/releases?page=${page}&per_page=${per_page}&sort=${sort}&sort_order=${sort_order}`;
    
    const collection = await makeDiscogsRequest(
      collectionUrl,
      profile.discogs_oauth_token,
      profile.discogs_oauth_token_secret
    );

    console.log('Raw releases count:', collection.releases?.length);
    
    // Filter for CDs only - expanded format matching
    const cdReleases = collection.releases.filter((release: any) => {
      const formats = release.basic_information?.formats || [];
      return formats.some((format: any) => {
        const name = (format.name || '').toLowerCase();
        return name.includes('cd') || 
               name === 'compact disc' || 
               name === 'hdcd' ||
               name === 'sacd' ||
               name.includes('disc');
      });
    });

    console.log('Filtered CD releases count:', cdReleases.length);

    // Get collection value if available
    let collectionValue = null;
    try {
      const valueUrl = `https://api.discogs.com/users/${profile.discogs_username}/collection/value`;
      collectionValue = await makeDiscogsRequest(
        valueUrl,
        profile.discogs_oauth_token,
        profile.discogs_oauth_token_secret
      );
    } catch (e) {
      console.log('Could not fetch collection value:', e);
    }

    return new Response(JSON.stringify({
      releases: cdReleases,
      pagination: collection.pagination,
      value: collectionValue,
      discogs_username: profile.discogs_username,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Collection fetch error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
