import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SearchRequest {
  portal: string;
  query: string;
  page?: number;
  pageSize?: number;
  filters?: {
    category?: string;
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
  userIdentifier?: string;
}

interface FeedRequest {
  portal: string;
}

interface PublicationRequest {
  portal: string;
  id: string;
}

interface SiteSettingsRequest {
  portal: string;
}

const DEFAULT_PORTALS = [
  'mfkn.naevneneshus.dk',
  'aen.naevneneshus.dk',
  'ekn.naevneneshus.dk',
  'pn.naevneneshus.dk',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (path.endsWith('/search') && req.method === 'POST') {
      return await handleSearch(req, supabase);
    } else if (path.endsWith('/feed') && req.method === 'POST') {
      return await handleFeed(req, supabase);
    } else if (path.endsWith('/publication') && req.method === 'POST') {
      return await handlePublication(req, supabase);
    } else if (path.endsWith('/site-settings') && req.method === 'POST') {
      return await handleSiteSettings(req);
    } else if (path.endsWith('/portals') && req.method === 'GET') {
      return await handlePortals();
    } else if (path.endsWith('/health') && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.2',
          endpoints: ['/search', '/feed', '/publication', '/health']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: 'Not found',
          availableEndpoints: [
            { method: 'POST', path: '/search', description: 'Search publications' },
            { method: 'POST', path: '/feed', description: 'Get latest publications' },
            { method: 'POST', path: '/publication', description: 'Get specific publication' },
            { method: 'POST', path: '/site-settings', description: 'Get portal SiteSettings with categories' },
            { method: 'GET', path: '/portals', description: 'List available portals' },
            { method: 'GET', path: '/health', description: 'Health check' }
          ]
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSearch(req: Request, supabase: any) {
  const startTime = Date.now();
  let body: SearchRequest;

  try {
    body = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { portal, query, page = 1, pageSize = 10, filters = {}, userIdentifier } = body;

  if (!portal || !query) {
    return new Response(
      JSON.stringify({ error: 'Portal and query are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/Search`;
    const payload = {
      query,
      filters,
      pagination: {
        page,
        pageSize,
      },
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;
    const resultCount = data.totalCount || 0;

    await supabase.from('query_logs').insert({
      portal,
      query,
      filters,
      result_count: resultCount,
      execution_time_ms: executionTime,
      user_identifier: userIdentifier,
    });

    return new Response(
      JSON.stringify({
        ...data,
        meta: {
          executionTime,
          portal,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    await supabase.from('query_logs').insert({
      portal,
      query,
      filters,
      result_count: 0,
      execution_time_ms: executionTime,
      error_message: error.message,
      user_identifier: userIdentifier,
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleFeed(req: Request, supabase: any) {
  let body: FeedRequest;

  try {
    body = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { portal } = body;

  if (!portal) {
    return new Response(
      JSON.stringify({ error: 'Portal is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/Feed`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSiteSettings(req: Request) {
  let body: SiteSettingsRequest;

  try {
    body = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { portal } = body;

  if (!portal) {
    return new Response(
      JSON.stringify({ error: 'Portal is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const response = await fetch(`https://${portal}/api/SiteSettings`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const settings = await response.json();

    return new Response(
      JSON.stringify({
        portal,
        settings,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handlePortals() {
  try {
    const response = await fetch('https://naevneneshus.dk/afgoerelsesportaler/');

    if (!response.ok) {
      throw new Error(`Portal page returned ${response.status}`);
    }

    const html = await response.text();
    const matches = new Set<string>();
    const regex = /https?:\/\/([\w.-]+\.naevneneshus\.dk)/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      matches.add(match[1]);
    }

    const portals = Array.from(matches);

    return new Response(
      JSON.stringify({ portals: portals.length > 0 ? portals : DEFAULT_PORTALS }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to fetch portals', error);
    return new Response(
      JSON.stringify({ portals: DEFAULT_PORTALS, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handlePublication(req: Request, supabase: any) {
  let body: PublicationRequest;

  try {
    body = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { portal, id } = body;

  if (!portal || !id) {
    return new Response(
      JSON.stringify({ error: 'Portal and ID are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/Publication/${id}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}