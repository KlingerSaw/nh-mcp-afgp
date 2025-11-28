import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CategoryFilter {
  id: string;
  title: string;
}

interface SearchRequest {
  portal: string;
  query: string;
  categories?: CategoryFilter[];
  sort?: string;
  types?: string[];
  skip?: number;
  size?: number;
  userIdentifier?: string;
  originalQuery?: string;
}

interface FeedRequest {
  portal: string;
}

interface PublicationRequest {
  portal: string;
  id: string;
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  console.log(`[${requestId}] 📥 INCOMING REQUEST`);
  console.log(`[${requestId}]   Method: ${method}`);
  console.log(`[${requestId}]   Path: ${path}`);
  console.log(`[${requestId}]   Auth: ${req.headers.get('authorization') ? 'present' : 'missing'}`);

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });

  try {
    const mcpPortalMatch = path.match(/\/mcp\/([a-z0-9.-]+)$/);
    if (mcpPortalMatch && req.method === 'POST') {
      const portal = mcpPortalMatch[1];
      console.log(`🎯 Portal-specific tool called: ${portal}`);
      console.log(`📍 Full path: ${path}`);
      console.log(`🔑 Auth: ${req.headers.get('authorization') ? 'present' : 'missing'}`);

      const bodyText = await req.text();
      const body = JSON.parse(bodyText);
      body.portal = portal;
      const newReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(body),
      });
      return await handleMCP(newReq, supabase);
    } else if (path.endsWith('/mcp') && req.method === 'POST') {
      return await handleMCP(req, supabase);
    } else if (path.endsWith('/search') && req.method === 'POST') {
      return await handleSearch(req, supabase);
    } else if (path.endsWith('/feed') && req.method === 'POST') {
      return await handleFeed(req, supabase);
    } else if (path.endsWith('/publication') && req.method === 'POST') {
      return await handlePublication(req, supabase);
    } else if (path.endsWith('/site-settings') && req.method === 'POST') {
      return await handleSiteSettings(req);
    } else if (path.endsWith('/portals') && req.method === 'GET') {
      return await handlePortals();
    } else if (path.endsWith('/openapi.json') && req.method === 'GET') {
      console.log(`[${requestId}] 📖 Routing to OpenAPI spec handler`);
      return handleOpenAPISpec(req);
    } else if ((path === '/naevneneshus-mcp' || path === '/naevneneshus-mcp/') && req.method === 'GET') {
      console.log(`[${requestId}] 🏠 Root endpoint accessed`);
      return new Response(
        JSON.stringify({
          name: 'Nævneneshus Search API',
          version: '1.4.0',
          description: 'Søg i danske administrative afgørelser på tværs af flere portaler',
          endpoints: {
            root: { path: '/', method: 'GET', description: 'API information' },
            openapi: { path: '/openapi.json', method: 'GET', description: 'OpenAPI 3.0 specification' },
            health: { path: '/health', method: 'GET', description: 'Health check' },
            portals: { path: '/portals', method: 'GET', description: 'List available portals' },
            portalSearch: { path: '/mcp/{portal}', method: 'POST', description: 'Search specific portal' }
          },
          documentation: `${supabaseUrl}/functions/v1/naevneneshus-mcp/openapi.json`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (path.endsWith('/health') && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.3.0',
          endpoints: ['/mcp', '/search', '/feed', '/publication', '/health', '/openapi.json']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: 'Not found',
          availableEndpoints: [
            { method: 'POST', path: '/mcp', description: 'MCP-compatible search (accepts query string, returns formatted text)' },
            { method: 'POST', path: '/search', description: 'Search publications' },
            { method: 'POST', path: '/feed', description: 'Get latest publications' },
            { method: 'POST', path: '/publication', description: 'Get specific publication' },
            { method: 'POST', path: '/site-settings', description: 'Get portal SiteSettings with categories' },
            { method: 'GET', path: '/portals', description: 'List available portals' },
            { method: 'GET', path: '/health', description: 'Health check' },
            { method: 'GET', path: '/openapi.json', description: 'OpenAPI specification for Open WebUI integration' }
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

async function handleMCP(req: Request, supabase: any) {
  const startTime = Date.now();
  let body: { query: string; portal?: string; page?: number; pageSize?: number };

  try {
    body = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body', expected: { query: 'your search', portal: 'mfkn.naevneneshus.dk' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { query, portal = 'mfkn.naevneneshus.dk', page = 1, pageSize = 5 } = body;

  if (!query) {
    return new Response(
      JSON.stringify({ error: 'query parameter is required', example: { query: 'jordforurening' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { cleanQuery, categoryTitles } = parseQueryWithCategories(query);
  const categories = await resolveCategoryIds(portal, categoryTitles, supabase);

  console.log('Original query:', query);
  console.log('Clean query:', cleanQuery);
  console.log('Category titles:', categoryTitles);
  console.log('Resolved categories:', categories);

  const optimizedQuery = await optimizeQuery(cleanQuery, portal, supabase);

  console.log('Optimized query:', optimizedQuery);

  try {
    const apiUrl = `https://${portal}/api/Search`;
    const payload = {
      query: optimizedQuery,
      categories: categories.length > 0 ? categories : undefined,
      parameters: {},
      sort: 1,
      skip: (page - 1) * pageSize,
      size: pageSize,
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
      query: cleanQuery,
      filters: { sort: 1, categories: categoryTitles },
      result_count: resultCount,
      execution_time_ms: executionTime,
      user_identifier: 'openwebui',
    });

    const formattedResult = formatMCPResultsJSON(
      data,
      portal,
      query,           // Original query
      cleanQuery,      // Clean query
      optimizedQuery,  // Optimized query
      categoryTitles,  // Extracted categories
      executionTime,
      page,
      pageSize
    );

    return new Response(JSON.stringify(formattedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;

    await supabase.from('query_logs').insert({
      portal,
      query: cleanQuery,
      filters: { sort: 1, categories: categoryTitles },
      result_count: 0,
      execution_time_ms: executionTime,
      error_message: error.message,
      user_identifier: 'openwebui',
    });

    return new Response(
      JSON.stringify({ error: error.message, portal, query: cleanQuery }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function formatMCPResults(data: any, portal: string, query: string, executionTime: number): string {
  const total = data.totalCount || 0;
  const publications = data.publications || [];

  if (total === 0) {
    return `🔍 Ingen resultater fundet for "${query}" på ${portal}\n\n💡 Prøv:\n- Brug andre søgeord\n- Fjern datofiltre\n- Tjek stavning`;
  }

  const lines: string[] = [
    `📋 Fandt ${total} resultater for "${query}"`,
    `🌐 Portal: ${portal}`,
    `⏱️ Søgetid: ${executionTime}ms`,
    '',
  ];

  const categoryCounts = data.categoryCounts || [];
  if (categoryCounts.length > 0) {
    lines.push('📊 Kategorier:');
    for (const cat of categoryCounts.slice(0, 5)) {
      lines.push(`   • ${cat.category}: ${cat.count}`);
    }
    lines.push('');
  }

  lines.push(`📄 Viser ${publications.length} resultater:`);
  lines.push('─'.repeat(60));

  for (let i = 0; i < publications.length; i++) {
    const pub = publications[i];
    const title = pub.title || 'Uden titel';
    const categories = pub.categories || [];
    const jnr = pub.jnr || [];
    const date = pub.date || 'N/A';
    const pubId = pub.id || '';
    const pubType = pub.type || 'ruling';

    const link = `https://${portal}/${pubType === 'news' ? 'nyhed' : 'afgoerelse'}/${pubId}`;

    lines.push('');
    lines.push(`${i + 1}. ${title}`);

    if (categories.length > 0) {
      lines.push(`   📑 ${categories.join(', ')}`);
    }

    if (jnr.length > 0) {
      lines.push(`   📋 Journal: ${jnr.join(', ')}`);
    }

    lines.push(`   📅 Dato: ${date}`);
    lines.push(`   🔗 ${link}`);
  }

  if (total > publications.length) {
    const nextPage = Math.floor((data.skip || 0) / (data.size || 10)) + 2;
    lines.push('');
    lines.push('─'.repeat(60));
    lines.push(`💡 Viser ${publications.length} af ${total} resultater. Brug page=${nextPage} for flere.`);
  }

  return lines.join('\n');
}

function formatMCPResultsJSON(
  data: any,
  portal: string,
  originalQuery: string,
  cleanQuery: string,
  optimizedQuery: string,
  extractedCategories: string[],
  executionTime: number,
  page: number,
  pageSize: number
) {
  const total = data.totalCount || 0;
  const publications = data.publications || [];
  const categoryCounts = data.categoryCounts || [];

  // Calculate what was removed from the query
  const removedFromQuery: string[] = [];
  if (extractedCategories.length > 0) {
    removedFromQuery.push(`Kategorier: ${extractedCategories.join(', ')}`);
  }

  if (total === 0) {
    return {
      success: true,
      queryProcessing: {
        original: originalQuery,
        cleaned: cleanQuery,
        optimized: optimizedQuery,
        extractedCategories: extractedCategories,
        removedFromQuery: removedFromQuery
      },
      portal,
      totalCount: 0,
      results: [],
      executionTime,
      message: 'Ingen resultater fundet',
      suggestions: ['Brug andre søgeord', 'Fjern datofiltre', 'Tjek stavning']
    };
  }

  const results = publications.map((pub: any) => {
    const pubType = pub.type || 'ruling';
    const link = `https://${portal}/${pubType === 'news' ? 'nyhed' : 'afgoerelse'}/${pub.id}`;

    return {
      id: pub.id,
      title: pub.title || 'Uden titel',
      date: pub.date || null,
      categories: pub.categories || [],
      journalNumbers: pub.jnr || [],
      type: pubType,
      link
    };
  });

  const response: any = {
    success: true,
    queryProcessing: {
      original: originalQuery,
      cleaned: cleanQuery,
      optimized: optimizedQuery,
      extractedCategories: extractedCategories,
      removedFromQuery: removedFromQuery
    },
    portal,
    totalCount: total,
    page,
    pageSize,
    results,
    executionTime
  };

  if (categoryCounts.length > 0) {
    response.categoryCounts = categoryCounts.slice(0, 5).map((cat: any) => ({
      category: cat.category,
      count: cat.count
    }));
  }

  if (total > publications.length) {
    response.pagination = {
      hasMore: true,
      nextPage: page + 1,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  return response;
}

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

  const {
    portal,
    query,
    categories = [],
    sort = '1',
    types = [],
    skip = 0,
    size = 10,
    userIdentifier = 'anonymous',
    originalQuery = query
  } = body;

  if (!portal || !query) {
    return new Response(
      JSON.stringify({ error: 'portal and query are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/Search`;

    const categoryMap = categories.length > 0 ? categories.map((c) => ({
      id: c.id,
      title: c.title,
    })) : undefined;

    const payload = {
      query,
      categories: categoryMap,
      parameters: {},
      sort: parseInt(sort),
      types: types.length > 0 ? types : undefined,
      skip,
      size,
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
      query: originalQuery,
      filters: { sort, categories: categories.map(c => c.title), types },
      result_count: resultCount,
      execution_time_ms: executionTime,
      user_identifier: userIdentifier,
    });

    const responseData = {
      ...data,
      meta: {
        executionTime,
        portal,
      },
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;

    await supabase.from('query_logs').insert({
      portal,
      query: originalQuery,
      filters: { sort, categories: categories.map(c => c.title), types },
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
  const startTime = Date.now();
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
      JSON.stringify({ error: 'portal is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/Feed`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;

    await supabase.from('connection_logs').insert({
      portal,
      endpoint: '/api/Feed',
      response_time_ms: executionTime,
      status_code: 200,
      success: true,
    });

    const responseData = {
      ...data,
      meta: {
        executionTime,
        portal,
      },
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;

    await supabase.from('connection_logs').insert({
      portal,
      endpoint: '/api/Feed',
      response_time_ms: executionTime,
      status_code: 500,
      success: false,
      error_message: error.message,
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handlePublication(req: Request, supabase: any) {
  const startTime = Date.now();
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
      JSON.stringify({ error: 'portal and id are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/Publication`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;

    await supabase.from('connection_logs').insert({
      portal,
      endpoint: '/api/Publication',
      response_time_ms: executionTime,
      status_code: 200,
      success: true,
    });

    const responseData = {
      ...data,
      meta: {
        executionTime,
        portal,
      },
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;

    await supabase.from('connection_logs').insert({
      portal,
      endpoint: '/api/Publication',
      response_time_ms: executionTime,
      status_code: 500,
      success: false,
      error_message: error.message,
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSiteSettings(req: Request) {
  const startTime = Date.now();
  let body: { portal: string };

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
      JSON.stringify({ error: 'portal is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/SiteSettings`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...data,
        meta: { executionTime, portal },
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
  const portals = [
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

  return new Response(
    JSON.stringify({ portals }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function parseQueryWithCategories(query: string): { cleanQuery: string; categoryTitles: string[] } {
  const categoryPattern = /,?\s*kategori[er]*:\s*([^,]+)/gi;
  const categoryTitles: string[] = [];

  let match;
  while ((match = categoryPattern.exec(query)) !== null) {
    categoryTitles.push(match[1].trim());
  }

  const cleanQuery = query.replace(categoryPattern, '').trim();

  return { cleanQuery, categoryTitles };
}

async function resolveCategoryIds(
  portal: string,
  categoryTitles: string[],
  supabase: any
): Promise<CategoryFilter[]> {
  if (categoryTitles.length === 0) return [];

  const { data, error } = await supabase
    .from('site_categories')
    .select('category_id, category_title')
    .eq('portal', portal)
    .in('category_title', categoryTitles);

  if (error) {
    console.error('Error resolving categories:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.category_id,
    title: row.category_title,
  }));
}

async function optimizeQuery(query: string, portal: string, supabase: any): Promise<string> {
  const { data: synonyms } = await supabase
    .from('query_synonyms')
    .select('term, synonyms')
    .eq('portal', portal);

  const { data: acronyms } = await supabase
    .from('portal_acronyms')
    .select('acronym, full_term')
    .eq('portal', portal);

  let optimizedQuery = query;

  if (acronyms && acronyms.length > 0) {
    for (const acronym of acronyms) {
      const regex = new RegExp(`\\b${acronym.acronym}\\b`, 'gi');
      if (regex.test(optimizedQuery)) {
        optimizedQuery += ` ${acronym.full_term}`;
      }
    }
  }

  if (synonyms && synonyms.length > 0) {
    for (const synonym of synonyms) {
      const regex = new RegExp(`\\b${synonym.term}\\b`, 'gi');
      if (regex.test(optimizedQuery)) {
        optimizedQuery += ` ${synonym.synonyms.join(' ')}`;
      }
    }
  }

  return optimizedQuery;
}

function handleOpenAPISpec(req: Request) {
  console.log('');
  console.log('=' .repeat(53));
  console.log('🔍 OPENAPI SPEC REQUEST STARTED');
  console.log('=' .repeat(53));

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log('');
  console.log('✅ Base URL:', supabaseUrl);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ ERROR: Missing environment variables');
    console.error('  - SUPABASE_URL:', supabaseUrl ? 'present' : 'MISSING');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'present' : 'MISSING');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing environment variables' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const baseUrl = `${supabaseUrl}/functions/v1/naevneneshus-mcp`;
  console.log('✅ Function base URL:', baseUrl);

  console.log('');
  console.log('📊 Creating Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
  console.log('✅ Supabase client created successfully');

  const authHeader = req.headers.get('authorization');
  console.log('');
  console.log('🔐 Request Authentication:');
  console.log('  - Authorization header:', authHeader ? 'present' : 'No authorization header');
  if (authHeader) {
    console.log('  - Header format:', authHeader.substring(0, 20) + '...');
  }

  (async () => {
    const headerObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (!key.toLowerCase().includes('authorization') && !key.toLowerCase().includes('key')) {
        headerObj[key] = value;
      }
    });

    console.log('');

  console.log('📊 STEP 1: Fetching portals from database...');
  const { data: portals, error: portalsError } = await supabase
    .from('portal_metadata')
    .select('portal, name, domain_focus')
    .order('portal');

  if (portalsError) {
    console.error('❌ ERROR: Failed to fetch portals');
    console.error('  - Error Code:', portalsError.code);
    console.error('  - Error Message:', portalsError.message);
    console.error('  - Error Details:', portalsError.details);
    throw new Error(`Failed to fetch portals: ${portalsError.message}`);
  }

  console.log(`✅ SUCCESS: Fetched ${portals?.length || 0} portals`);
  if (portals && portals.length > 0) {
    console.log('  - Portal List:', portals.map(p => p.portal).join(', '));
  }

  const paths: any = {};

  if (portals && portals.length > 0) {
    const portalList = portals.map(p => p.portal);

    console.log('');
    console.log('📊 STEP 2: Fetching metadata (categories, legal areas, acronyms...');
    console.log('  - Fetching for portals:', portalList.length);
    const [categoriesResult, legalAreasResult, acronymsResult] = await Promise.all([
      supabase.from('site_categories').select('portal, category_title').in('portal', portalList),
      supabase.from('legal_areas').select('portal, area_name').in('portal', portalList),
      supabase.from('portal_acronyms').select('portal, acronym, full_term').in('portal', portalList)
    ]);

    if (categoriesResult.error) {
      console.warn('⚠️  Warning: Categories fetch error:', categoriesResult.error.message);
    }
    if (legalAreasResult.error) {
      console.warn('⚠️  Warning: Legal areas fetch error:', legalAreasResult.error.message);
    }
    if (acronymsResult.error) {
      console.warn('⚠️  Warning: Acronyms fetch error:', acronymsResult.error.message);
    }

    console.log(`✅ SUCCESS: Metadata fetched`);
    console.log(`  - Categories: ${categoriesResult.data?.length || 0}`);
    console.log(`  - Legal areas: ${legalAreasResult.data?.length || 0}`);
    console.log(`  - Acronyms: ${acronymsResult.data?.length || 0}`);

    const categoriesByPortal = new Map<string, string[]>();
    const legalAreasByPortal = new Map<string, string[]>();
    const acronymsByPortal = new Map<string, Array<{acronym: string, full_term: string}>>();

    categoriesResult.data?.forEach(c => {
      if (!categoriesByPortal.has(c.portal)) categoriesByPortal.set(c.portal, []);
      if (categoriesByPortal.get(c.portal)!.length < 10) {
        categoriesByPortal.get(c.portal)!.push(c.category_title);
      }
    });

    legalAreasResult.data?.forEach(a => {
      if (!legalAreasByPortal.has(a.portal)) legalAreasByPortal.set(a.portal, []);
      if (legalAreasByPortal.get(a.portal)!.length < 10) {
        legalAreasByPortal.get(a.portal)!.push(a.area_name);
      }
    });

    acronymsResult.data?.forEach(a => {
      if (!acronymsByPortal.has(a.portal)) acronymsByPortal.set(a.portal, []);
      if (acronymsByPortal.get(a.portal)!.length < 5) {
        acronymsByPortal.get(a.portal)!.push({acronym: a.acronym, full_term: a.full_term});
      }
    });

    console.log('');
    console.log('📊 STEP 3: Building OpenAPI paths for each portal...');

    for (const portalMeta of portals) {
      console.log(`  - Creating tool for: ${portalMeta.portal}`);
      const operationId = `search_${portalMeta.portal.replace(/[^a-z0-9]/gi, '_')}`;
      const categoryList = categoriesByPortal.get(portalMeta.portal)?.join(', ') || '';
      const legalAreaList = legalAreasByPortal.get(portalMeta.portal)?.join(', ') || '';
      const acronymList = acronymsByPortal.get(portalMeta.portal)?.map(a => `${a.acronym} (${a.full_term})`).join(', ') || '';

      let description = `Søg i ${portalMeta.name || portalMeta.portal} - danske administrative afgørelser.\n\nEksempel: {"query": "jordforurening"}`;
      if (legalAreaList) {
        description += `\n\nLovområder: ${legalAreaList}`;
      }
      if (categoryList) {
        description += `\n\nTilgængelige kategorier: ${categoryList}`;
      }
      if (acronymList) {
        description += `\n\nAlmindelige akronymer: ${acronymList}`;
      }
      description += `\n\nSystemet forstår dansk sprog og ekspanderer automatisk akronymer og synonymer.`;

      paths[`/mcp/${portalMeta.portal}`] = {
        post: {
          summary: `Søg i ${portalMeta.name || portalMeta.portal}`,
          description,
          operationId,
          'x-openai-isConsequential': false,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Søgeord på dansk. Eksempel: "jordforurening" eller "MBL § 72"',
                      example: 'jordforurening',
                    },
                    page: {
                      type: 'integer',
                      description: 'Side nummer (standard: 1)',
                      default: 1,
                      minimum: 1,
                    },
                    pageSize: {
                      type: 'integer',
                      description: 'Antal resultater per side (standard: 5, max: 20)',
                      default: 5,
                      minimum: 1,
                      maximum: 20,
                    },
                  },
                },
                example: {
                  query: 'jordforurening',
                  page: 1,
                  pageSize: 5,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Søgning gennemført succesfuldt',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      queryProcessing: {
                        type: 'object',
                        description: 'Information about query processing and optimization',
                        properties: {
                          original: { type: 'string', example: 'jordforurening, kategori: Miljø', description: 'Original query from user' },
                          cleaned: { type: 'string', example: 'jordforurening', description: 'Query after category extraction' },
                          optimized: { type: 'string', example: 'jordforurening forurening jord', description: 'Query with synonyms and acronyms' },
                          extractedCategories: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['Miljø'],
                            description: 'Categories extracted from query'
                          },
                          removedFromQuery: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['Kategorier: Miljø'],
                            description: 'What was removed from the search string'
                          }
                        }
                      },
                      portal: { type: 'string', example: 'mfkn.naevneneshus.dk' },
                      totalCount: { type: 'integer', example: 42 },
                      page: { type: 'integer', example: 1 },
                      pageSize: { type: 'integer', example: 5 },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            date: { type: 'string', nullable: true },
                            categories: { type: 'array', items: { type: 'string' } },
                            journalNumbers: { type: 'array', items: { type: 'string' } },
                            type: { type: 'string', enum: ['ruling', 'news'] },
                            link: { type: 'string', format: 'uri' }
                          }
                        }
                      },
                      executionTime: { type: 'integer', description: 'Execution time in milliseconds' },
                      categoryCounts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            category: { type: 'string' },
                            count: { type: 'integer' }
                          }
                        }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          hasMore: { type: 'boolean' },
                          nextPage: { type: 'integer' },
                          totalPages: { type: 'integer' }
                        }
                      }
                    }
                  }
                },
              },
            },
            '400': {
              description: 'Ugyldig forespørgsel',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' }
                    }
                  },
                },
              },
            },
            '500': {
              description: 'Serverfejl',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string' },
                      portal: { type: 'string' },
                      query: { type: 'string' }
                    }
                  },
                },
              },
            },
          },
        },
      };
    }
  }

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Nævneneshus Search API - Portal-specifik',
      version: '1.4.0',
      description: 'Søg i danske administrative afgørelser på tværs af flere portaler. Hvert portal har sit eget endpoint med optimeret søgning baseret på lovområder, kategorier og akronymer.',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Supabase Edge Function',
      },
    ],
    paths: {
      '/': {
        get: {
          summary: 'API Information',
          description: 'Get information about this API and available endpoints',
          operationId: 'getApiInfo',
          responses: {
            '200': {
              description: 'API information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      version: { type: 'string' },
                      description: { type: 'string' },
                      endpoints: { type: 'object' },
                      documentation: { type: 'string', format: 'uri' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/openapi.json': {
        get: {
          summary: 'Get OpenAPI Specification',
          description: 'Returns the complete OpenAPI 3.0 specification for this API',
          operationId: 'getOpenAPISpec',
          responses: {
            '200': {
              description: 'OpenAPI 3.0 specification',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    description: 'OpenAPI 3.0 specification object'
                  }
                }
              }
            }
          }
        }
      },
      ...paths,
      '/search': {
        post: {
          summary: 'Search publications',
          description: 'Search for administrative rulings and publications across Danish portals',
          operationId: 'searchPublications',
          'x-openai-isConsequential': false,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['portal', 'query'],
                  properties: {
                    portal: {
                      type: 'string',
                      description: 'Portal hostname',
                      enum: [
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
                      ],
                      default: 'fkn.naevneneshus.dk',
                    },
                    query: {
                      type: 'string',
                      description: 'Search query in Danish',
                      example: 'jordforurening',
                    },
                    categories: {
                      type: 'array',
                      description: 'Filter by categories',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                        },
                      },
                    },
                    sort: {
                      type: 'string',
                      description: 'Sort order',
                      enum: ['Score', 'Date'],
                      default: 'Score',
                    },
                    types: {
                      type: 'array',
                      description: 'Publication types',
                      items: {
                        type: 'string',
                        enum: ['ruling', 'news'],
                      },
                    },
                    skip: {
                      type: 'integer',
                      description: 'Number of results to skip for pagination',
                      default: 0,
                    },
                    size: {
                      type: 'integer',
                      description: 'Number of results to return',
                      default: 10,
                      maximum: 100,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful search',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalCount: { type: 'integer' },
                      publications: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            date: { type: 'string' },
                            categories: { type: 'array', items: { type: 'string' } },
                            jnr: { type: 'array', items: { type: 'string' } },
                            type: { type: 'string', enum: ['ruling', 'news'] },
                          },
                        },
                      },
                      categoryCounts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            category: { type: 'string' },
                            count: { type: 'integer' },
                          },
                        },
                      },
                      meta: {
                        type: 'object',
                        properties: {
                          executionTime: { type: 'integer' },
                          portal: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
            },
            '500': {
              description: 'Internal server error',
            },
          },
        },
      },
      '/portals': {
        get: {
          summary: 'List available portals',
          description: 'Get list of all available Nævneneshus portals',
          operationId: 'listPortals',
          'x-openai-isConsequential': false,
          responses: {
            '200': {
              description: 'List of portals',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      portals: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/feed': {
        post: {
          summary: 'Get latest publications',
          description: 'Retrieve latest publications from a portal',
          operationId: 'getLatestPublications',
          'x-openai-isConsequential': false,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['portal'],
                  properties: {
                    portal: {
                      type: 'string',
                      description: 'Portal hostname',
                      enum: [
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
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Latest publications',
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Optional Supabase anon key for authentication',
        },
      },
    },
    security: [],
  };

  const toolsCount = Object.keys(paths).filter(p => p.startsWith('/mcp/')).length;

  console.log('');
  console.log('✅ STEP 4: OpenAPI spec generation complete');
  console.log(`  - Portal-specific tools: ${toolsCount}`);
  console.log(`  - Total paths: ${Object.keys(spec.paths).length}`);
  console.log('');
  console.log('🎉 RETURNING OPENAPI SPEC TO CLIENT');
  console.log(`  - Response size: ~${JSON.stringify(spec).length} bytes`);
  console.log('=' .repeat(53));
  console.log('');
  })();

  return new Response(JSON.stringify(spec), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
