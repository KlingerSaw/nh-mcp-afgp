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

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Route handling
    if (path.endsWith('/search') && req.method === 'POST') {
      return await handleSearch(req, supabase);
    } else if (path.endsWith('/feed') && req.method === 'POST') {
      return await handleFeed(req, supabase);
    } else if (path.endsWith('/publication') && req.method === 'POST') {
      return await handlePublication(req, supabase);
    } else if (path.endsWith('/health') && req.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
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
  const body: SearchRequest = await req.json();
  
  const { portal, query, page = 1, pageSize = 10, filters = {}, userIdentifier } = body;

  if (!portal || !query) {
    return new Response(
      JSON.stringify({ error: 'Portal and query are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Build API request to the portal
    const apiUrl = `https://${portal}/api/Search`;
    const { category, dateRange = {} } = filters;
    const payload: Record<string, any> = {
      query,
      sort: 'Score',
      types: [],
      skip: (page - 1) * pageSize,
      size: pageSize,
    };

    if (category) {
      payload.categories = [
        {
          title: category,
        },
      ];
    }

    if (dateRange.start || dateRange.end) {
      payload.dateRange = {
        ...(dateRange.start ? { start: dateRange.start } : {}),
        ...(dateRange.end ? { end: dateRange.end } : {}),
      };
    }

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

    // Log to database
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
    
    // Log error to database
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
  const body: FeedRequest = await req.json();
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

async function handlePublication(req: Request, supabase: any) {
  const body: PublicationRequest = await req.json();
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