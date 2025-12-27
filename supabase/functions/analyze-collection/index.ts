import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { collection, analysisType } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('AI API key not configured');
    }

    console.log(`Analyzing collection with ${collection?.length || 0} items, type: ${analysisType}`);

    // Build a summary of the collection for AI analysis
    const collectionSummary = collection?.slice(0, 100).map((item: any) => ({
      title: item.basic_information?.title,
      artist: item.basic_information?.artists?.[0]?.name,
      year: item.basic_information?.year,
      genres: item.basic_information?.genres,
      styles: item.basic_information?.styles,
    })) || [];

    let systemPrompt = '';
    let userPrompt = '';

    if (analysisType === 'overview') {
      systemPrompt = `You are a music critic and collection analyst with deep knowledge of CD collecting, music history, and market values. You have a warm, enthusiastic personality and genuinely appreciate music collections. Provide insightful, engaging analysis.`;
      
      userPrompt = `Analyze this CD collection and provide a comprehensive overview:

Collection (${collection?.length || 0} CDs):
${JSON.stringify(collectionSummary, null, 2)}

Please provide:
1. **Collection Score** (1-10): Rate the overall quality and depth of this collection
2. **Genre Breakdown**: What genres dominate and their percentages
3. **Era Analysis**: What decades are most represented
4. **Hidden Gems**: Identify any rare or particularly valuable albums you notice
5. **Collection Personality**: What kind of music lover does this collection reveal?
6. **Recommendations**: 3-5 albums that would complement this collection
7. **Fun Fact**: Share something interesting about one of the albums

Be enthusiastic and specific! Reference actual albums from the collection.`;
    } else if (analysisType === 'value') {
      systemPrompt = `You are an expert CD collector and appraiser with extensive knowledge of the secondhand music market. You understand what makes CDs valuable: rarity, condition factors, first pressings, limited editions, and market demand.`;
      
      userPrompt = `Analyze the potential value aspects of this CD collection:

Collection (${collection?.length || 0} CDs):
${JSON.stringify(collectionSummary, null, 2)}

Please provide:
1. **Value Potential Rating** (1-10): Overall collectibility and value potential
2. **Potentially Valuable Items**: Identify any albums that might be worth more than average
3. **Rare Finds**: Note any first pressings, limited editions, or hard-to-find releases
4. **Market Insights**: Current trends affecting CD values
5. **Value Tips**: How to maximize collection value (condition, storage, etc.)
6. **Investment Outlook**: General thoughts on CD collecting as an investment

Be specific about which albums might have value and why.`;
    } else if (analysisType === 'taste') {
      systemPrompt = `You are a music psychologist and tastemaker who can read deep meaning into someone's music collection. You're insightful, sometimes playful, and always respectful of personal taste.`;
      
      userPrompt = `Analyze the musical taste revealed by this CD collection:

Collection (${collection?.length || 0} CDs):
${JSON.stringify(collectionSummary, null, 2)}

Please provide:
1. **Taste Profile**: Describe this collector's musical personality
2. **Listening Patterns**: What moods or situations might they listen to music in?
3. **Musical Journey**: How has their taste evolved based on the years of releases?
4. **Guilty Pleasures**: Any unexpected or eclectic choices that stand out?
5. **Missing Pieces**: Genres or artists conspicuously absent
6. **Spirit Animal Artist**: If this collection were one artist, who would it be and why?
7. **Playlist Suggestion**: A 5-song playlist that captures the essence of this collection

Be creative and fun while being genuinely insightful!`;
    } else {
      throw new Error('Invalid analysis type');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis generated');
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
