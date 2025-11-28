import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const PORTALS = [
  'fkn.naevneneshus.dk',
  'pkn.naevneneshus.dk',
  'mfkn.naevneneshus.dk',
  'dkbb.naevneneshus.dk',
  'dnfe.naevneneshus.dk',
  'klfu.naevneneshus.dk',
  'tele.naevneneshus.dk',
  'rn.naevneneshus.dk',
  'apv.naevneneshus.dk',
  'tvist.naevneneshus.dk',
  'ean.naevneneshus.dk',
  'byf.naevneneshus.dk',
  'ekn.naevneneshus.dk',
];

interface Category {
  id: string;
  title: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = [];

    for (const portal of PORTALS) {
      try {
        const response = await fetch(`https://${portal}/api/SiteSettings`);
        
        if (!response.ok) {
          console.error(`Failed to fetch settings for ${portal}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const categories = data.topics as Category[];

        if (!categories || !Array.isArray(categories)) {
          console.error(`No topics found for ${portal}`);
          continue;
        }

        for (const category of categories) {
          const { error } = await supabase
            .from('site_categories')
            .upsert(
              {
                portal,
                category_id: category.id,
                category_title: category.title,
                aliases: generateAliases(category.title),
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'portal,category_id',
              }
            );

          if (error) {
            console.error(`Error upserting category for ${portal}:`, error);
          }
        }

        results.push({
          portal,
          categoriesCount: categories.length,
          status: 'success',
        });
      } catch (error) {
        console.error(`Error processing ${portal}:`, error);
        results.push({
          portal,
          status: 'error',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ results, timestamp: new Date().toISOString() }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in sync-categories:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function generateAliases(title: string): string[] {
  const aliases: string[] = [title];
  
  const abbreviationMap: Record<string, string[]> = {
    'Miljøbeskyttelsesloven': ['MBL', 'Miljøbeskyttelse'],
    'Naturbeskyttelsesloven': ['NBL', 'Naturbeskyttelse'],
    'Planloven': ['PL'],
    'Husdyrloven': ['HDL'],
    'Råstofloven': ['RL'],
    'Jordforureningsloven': ['JFL'],
    'Vandløbsloven': ['VL'],
    'Skovloven': ['SL'],
  };

  for (const [fullName, abbrevs] of Object.entries(abbreviationMap)) {
    if (title.includes(fullName)) {
      aliases.push(...abbrevs);
    }
  }

  const words = title.split(/\s+/);
  if (words.length > 1) {
    const acronym = words
      .map(w => w[0])
      .join('')
      .toUpperCase();
    if (acronym.length >= 2 && acronym.length <= 5) {
      aliases.push(acronym);
    }
  }

  return [...new Set(aliases)];
}
