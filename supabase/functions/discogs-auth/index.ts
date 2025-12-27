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

// OAuth 1.0a helper functions
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, oauth_token, oauth_verifier, callback_url, oauth_token_secret } = body;
    console.log('Discogs auth action:', action);

    if (!DISCOGS_CONSUMER_KEY || !DISCOGS_CONSUMER_SECRET) {
      throw new Error('Discogs API credentials not configured');
    }

    if (action === 'request_token') {
      // Step 1: Get request token
      const requestTokenUrl = 'https://api.discogs.com/oauth/request_token';
      const nonce = generateNonce();
      const timestamp = generateTimestamp();

      const oauthParams: Record<string, string> = {
        oauth_consumer_key: DISCOGS_CONSUMER_KEY,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_callback: callback_url,
      };

      const signature = await generateSignature(
        'POST',
        requestTokenUrl,
        oauthParams,
        DISCOGS_CONSUMER_SECRET
      );

      oauthParams.oauth_signature = signature;

      const authHeader = 'OAuth ' + Object.keys(oauthParams)
        .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
        .join(', ');

      console.log('Requesting token from Discogs...');

      const response = await fetch(requestTokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'JackpotMusicCDExplorer/1.0',
        },
      });

      const responseText = await response.text();
      console.log('Discogs response status:', response.status);

      if (!response.ok) {
        console.error('Discogs error:', responseText);
        throw new Error(`Discogs API error: ${responseText}`);
      }

      const params = new URLSearchParams(responseText);
      const oauthToken = params.get('oauth_token');
      const oauthTokenSecret = params.get('oauth_token_secret');

      if (!oauthToken || !oauthTokenSecret) {
        throw new Error('Failed to get request token');
      }

      return new Response(JSON.stringify({
        oauth_token: oauthToken,
        oauth_token_secret: oauthTokenSecret,
        authorize_url: `https://discogs.com/oauth/authorize?oauth_token=${oauthToken}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'access_token') {
      // Step 3: Exchange request token for access token
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Authorization required');
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        throw new Error('Invalid user token');
      }

      console.log('Processing access token with oauth_token_secret:', oauth_token_secret ? 'present' : 'missing');
      
      const accessTokenUrl = 'https://api.discogs.com/oauth/access_token';
      const nonce = generateNonce();
      const timestamp = generateTimestamp();

      const oauthParams: Record<string, string> = {
        oauth_consumer_key: DISCOGS_CONSUMER_KEY,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_token: oauth_token,
        oauth_verifier: oauth_verifier,
      };

      const signature = await generateSignature(
        'POST',
        accessTokenUrl,
        oauthParams,
        DISCOGS_CONSUMER_SECRET,
        oauth_token_secret || ''
      );

      oauthParams.oauth_signature = signature;

      const authHeaderOAuth = 'OAuth ' + Object.keys(oauthParams)
        .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
        .join(', ');

      const response = await fetch(accessTokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeaderOAuth,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'JackpotMusicCDExplorer/1.0',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Discogs access token error:', responseText);
        throw new Error(`Failed to get access token: ${responseText}`);
      }

      const params = new URLSearchParams(responseText);
      const accessToken = params.get('oauth_token');
      const accessTokenSecret = params.get('oauth_token_secret');

      if (!accessToken || !accessTokenSecret) {
        throw new Error('Failed to get access token');
      }

      // Get Discogs user identity
      const identityNonce = generateNonce();
      const identityTimestamp = generateTimestamp();
      const identityUrl = 'https://api.discogs.com/oauth/identity';

      const identityParams: Record<string, string> = {
        oauth_consumer_key: DISCOGS_CONSUMER_KEY,
        oauth_nonce: identityNonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: identityTimestamp,
        oauth_token: accessToken,
      };

      const identitySignature = await generateSignature(
        'GET',
        identityUrl,
        identityParams,
        DISCOGS_CONSUMER_SECRET,
        accessTokenSecret
      );

      identityParams.oauth_signature = identitySignature;

      const identityAuthHeader = 'OAuth ' + Object.keys(identityParams)
        .map(key => `${percentEncode(key)}="${percentEncode(identityParams[key])}"`)
        .join(', ');

      const identityResponse = await fetch(identityUrl, {
        headers: {
          'Authorization': identityAuthHeader,
          'User-Agent': 'JackpotMusicCDExplorer/1.0',
        },
      });

      const identity = await identityResponse.json();
      console.log('Discogs identity:', identity.username);

      // Store tokens in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          discogs_username: identity.username,
          discogs_oauth_token: accessToken,
          discogs_oauth_token_secret: accessTokenSecret,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to store tokens:', updateError);
        throw new Error('Failed to store Discogs credentials');
      }

      return new Response(JSON.stringify({
        success: true,
        discogs_username: identity.username,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Discogs auth error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
