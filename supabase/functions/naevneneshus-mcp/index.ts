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

  console.log(`[${requestId}] =� INCOMING REQUEST`);
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
      console.log(`<� Portal-specific tool called: ${portal}`);
      console.log(`=� Full path: ${path}`);
      console.log(`= Auth: ${req.headers.get('authorization') ? 'present' : 'missing'}`);

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
      console.log(`[${requestId}] =� Routing to OpenAPI spec handler`);
      return handleOpenAPISpec(req);
    } else if ((path === '/naevneneshus-mcp' || path === '/naevneneshus-mcp/') && req.method === 'GET') {
      console.log(`[${requestId}] <� Root endpoint accessed`);
      return new Response(
        JSON.stringify({
          name: 'N�vneneshus Search API',
          version: '1.5.0',
          description: 'S�g i danske administrative afg�relser p� tv�rs af flere portaler',
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
          version: '1.5.0',
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

  const { cleanQuery: queryAfterExplicitCategories, categoryTitles: explicitCategories } = parseQueryWithCategories(query);

  let workingQuery = queryAfterExplicitCategories;
  const categories: CategoryFilter[] = [];
  const allCategoryTitles: string[] = [...explicitCategories];
  let matchedAlias: string | null = null;

  const aliasMatch = await resolveCategoryFromQueryAlias(workingQuery, portal, supabase);
  if (aliasMatch) {
    categories.push(aliasMatch.category);
    allCategoryTitles.push(aliasMatch.category.title);
    matchedAlias = aliasMatch.matchedAlias;
    workingQuery = removeMatchedAliasFromQuery(workingQuery, aliasMatch.matchedAlias);
  }

  if (explicitCategories.length > 0) {
    const explicitCats = await resolveCategoryIds(portal, explicitCategories, supabase);
    categories.push(...explicitCats);
  }

  console.log('Original query:', query);
  console.log('After explicit category extraction:', queryAfterExplicitCategories);
  console.log('After alias removal:', workingQuery);
  console.log('All category titles:', allCategoryTitles);
  console.log('Resolved categories:', categories);

  const { transformedQuery, elasticsearchQuery, removedFillerWords } = transformQuery(workingQuery);

  console.log('Transformed query:', transformedQuery);
  console.log('Elasticsearch query:', elasticsearchQuery);
  console.log('Removed filler words:', removedFillerWords);

  const { optimizedQuery, addedSynonyms, expandedAcronyms } = await optimizeQuery(
    elasticsearchQuery,
    portal,
    supabase
  );

  console.log('Optimized query:', optimizedQuery);
  console.log('Added synonyms:', addedSynonyms);
  console.log('Expanded acronyms:', expandedAcronyms);

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
      query: workingQuery,
      filters: {
        sort: 1,
        categories: allCategoryTitles,
        queryProcessing: {
          original: query,
          afterExplicitCategories: queryAfterExplicitCategories,
          afterAliasRemoval: workingQuery,
          transformed: transformedQuery,
          elasticsearch: elasticsearchQuery,
          final: optimizedQuery,
          extractedCategories: allCategoryTitles,
          matchedAlias: matchedAlias,
          removedFillerWords: removedFillerWords,
          addedSynonyms: addedSynonyms,
          expandedAcronyms: expandedAcronyms
        }
      },
      result_count: resultCount,
      execution_time_ms: executionTime,
      user_identifier: 'openwebui',
    });

    const formattedResult = formatMCPResultsJSON(
      data,
      portal,
      query,
      queryAfterExplicitCategories,
      workingQuery,
      transformedQuery,
      elasticsearchQuery,
      optimizedQuery,
      allCategoryTitles,
      matchedAlias,
      removedFillerWords,
      addedSynonyms,
      expandedAcronyms,
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
      query: workingQuery,
      filters: {
        sort: 1,
        categories: allCategoryTitles,
        queryProcessing: {
          original: query,
          afterExplicitCategories: queryAfterExplicitCategories,
          afterAliasRemoval: workingQuery,
          transformed: transformedQuery,
          elasticsearch: elasticsearchQuery,
          final: optimizedQuery,
          extractedCategories: allCategoryTitles,
          matchedAlias: matchedAlias,
          removedFillerWords: removedFillerWords,
          addedSynonyms: addedSynonyms,
          expandedAcronyms: expandedAcronyms
        }
      },
      result_count: 0,
      execution_time_ms: executionTime,
      error_message: error.message,
      user_identifier: 'openwebui',
    });

    return new Response(
      JSON.stringify({ error: error.message, portal, query: workingQuery }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function formatMCPResultsJSON(
  data: any,
  portal: string,
  originalQuery: string,
  afterExplicitCategories: string,
  afterAliasRemoval: string,
  transformed: string,
  elasticsearch: string,
  final: string,
  extractedCategories: string[],
  matchedAlias: string | null,
  removedFillerWords: string[],
  addedSynonyms: string[],
  expandedAcronyms: Array<{ acronym: string; fullTerm: string }>,
  executionTime: number,
  page: number,
  pageSize: number
) {
  const total = data.totalCount || 0;
  const publications = data.publications || [];
  const categoryCounts = data.categoryCounts || [];

  const queryProcessing = {
    original: originalQuery,
    afterExplicitCategories: afterExplicitCategories,
    afterAliasRemoval: afterAliasRemoval,
    transformed: transformed,
    elasticsearch: elasticsearch,
    final: final,
    extractedCategories: extractedCategories,
    matchedAlias: matchedAlias,
    removedFillerWords: removedFillerWords,
    addedSynonyms: addedSynonyms,
    expandedAcronyms: expandedAcronyms
  };

  if (total === 0) {
    return {
      success: true,
      queryProcessing,
      portal,
      totalCount: 0,
      results: [],
      executionTime,
      message: 'Ingen resultater fundet',
      suggestions: ['Brug andre s�geord', 'Fjern datofiltre', 'Tjek stavning']
    };
  }

  const results = publications.map((pub: any) => {
    const pubType = pub.type || 'ruling';
    const link = `https://${portal}/${pubType === 'news' ? 'nyhed' : 'afgoerelse'}/${pub.id}`;

    const cleanBody = decodeHtmlEntities(stripHtmlTags(pub.body || ''));

    return {
      id: pub.id,
      title: pub.title || 'Uden titel',
      date: pub.date || null,
      categories: pub.categories || [],
      journalNumbers: pub.jnr || [],
      type: pubType,
      link,
      body: cleanBody,
      abstract: pub.abstract || ''
    };
  });

  const response: any = {
    success: true,
    queryProcessing,
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

  response.aiPrompt = `Lav et kort resume (50-150 ord) af s�geresultaterne nedenfor. Fokuser p� de vigtigste fund og m�nstre p� tv�rs af resultaterne. Brug dansk sprog.

S�gning: "${originalQuery}"
Antal resultater: ${total}
Kategorier: ${extractedCategories.join(', ')}

Resultater:
${results.slice(0, 3).map((r: any, i: number) => `${i + 1}. ${r.title}\nKategorier: ${r.categories.join(', ')}\nDato: ${r.date}\nIndhold: ${r.body.substring(0, 500)}...`).join('\n\n')}`;

  return response;
}

async function handleSearch(req: Request, supabase: any) {
  return new Response(
    JSON.stringify({ error: 'Use portal-specific /mcp/{portal} endpoints instead' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleFeed(req: Request, supabase: any) {
  return new Response(
    JSON.stringify({ error: 'Not implemented' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handlePublication(req: Request, supabase: any) {
  return new Response(
    JSON.stringify({ error: 'Not implemented' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleSiteSettings(req: Request) {
  return new Response(
    JSON.stringify({ error: 'Not implemented' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
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

const FILLER_WORDS = new Set([
  'og', 'eller', 'i', 'p�', 'for', 'af', 'at', 'der', 'det', 'den', 'de',
  'en', 'et', 'som', 'med', 'til', 'the', 'a', 'an', 'ved', 'om',
  's�gning', 'praksis', 'praksiss�gning', 'efter', 'mbl', 'pl', 'hdl', 'rl', 'jfl', 'vl', 'sl'
]);

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

function transformQuery(rawQuery: string): {
  transformedQuery: string;
  elasticsearchQuery: string;
  removedFillerWords: string[];
} {
  const cleanedQuery = rawQuery.replace(/\s+/g, ' ').trim();
  const tokens = cleanedQuery.match(/"[^"]+"|[^\s]+/g) || [];
  const removedFillerWords: string[] = [];
  const processed: string[] = [];
  const seen = new Set<string>();

  tokens.forEach((token) => {
    const normalized = token.replace(/^["']|["']$/g, '');
    const lower = normalized.toLowerCase();

    if (['and', '&&', 'og', 'eller', 'or'].includes(lower)) {
      removedFillerWords.push(normalized);
      return;
    }

    if (FILLER_WORDS.has(lower)) {
      removedFillerWords.push(normalized);
      return;
    }

    if (normalized.match(/^\d+-\w+$/)) {
      removedFillerWords.push(normalized);
      return;
    }

    let processedToken: string;

    if (normalized === '�') {
      processedToken = `"�"`;
    } else if (/^\d+$/.test(normalized)) {
      processedToken = `"${normalized}"`;
    } else if (normalized.includes(' ')) {
      processedToken = `"${normalized}"`;
    } else {
      processedToken = normalized;
    }

    if (!seen.has(processedToken)) {
      seen.add(processedToken);
      processed.push(processedToken);
    }
  });

  const elasticsearchParts: string[] = [];
  for (let i = 0; i < processed.length; i++) {
    if (i > 0) {
      elasticsearchParts.push('AND');
    }
    elasticsearchParts.push(processed[i]);
  }

  const elasticsearchQuery = elasticsearchParts.join(' ');
  const transformedQuery = processed.join(' ');

  return {
    transformedQuery,
    elasticsearchQuery,
    removedFillerWords,
  };
}

async function resolveCategoryFromQueryAlias(
  query: string,
  portal: string,
  supabase: any
): Promise<{ category: CategoryFilter; matchedAlias: string } | null> {
  const { data: categories, error } = await supabase
    .from('site_categories')
    .select('category_id, category_title, aliases')
    .eq('portal', portal);

  if (error || !categories || categories.length === 0) {
    return null;
  }

  const queryUpper = query.toUpperCase();
  const queryWords = query.split(/\s+/).map(w => w.toUpperCase());

  for (const category of categories) {
    const aliases = category.aliases || [];

    for (const alias of aliases) {
      const aliasUpper = alias.toUpperCase();

      if (queryWords.includes(aliasUpper) || queryUpper.includes(aliasUpper)) {
        return {
          category: {
            id: category.category_id,
            title: category.category_title,
          },
          matchedAlias: alias,
        };
      }
    }
  }

  return null;
}

function removeMatchedAliasFromQuery(query: string, matchedAlias: string): string {
  const regex = new RegExp(`\\b${matchedAlias}\\b`, 'gi');
  return query.replace(regex, '').replace(/\s+/g, ' ').trim();
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

async function optimizeQuery(
  query: string,
  portal: string,
  supabase: any
): Promise<{
  optimizedQuery: string;
  addedSynonyms: string[];
  expandedAcronyms: Array<{ acronym: string; fullTerm: string }>;
}> {
  const { data: synonyms } = await supabase
    .from('query_synonyms')
    .select('term, synonyms')
    .eq('portal', portal);

  const { data: acronyms } = await supabase
    .from('portal_acronyms')
    .select('acronym, full_term')
    .eq('portal', portal);

  let optimizedQuery = query;
  const addedSynonyms: string[] = [];
  const expandedAcronyms: Array<{ acronym: string; fullTerm: string }> = [];

  if (acronyms && acronyms.length > 0) {
    for (const acronym of acronyms) {
      const regex = new RegExp(`\\b${acronym.acronym}\\b`, 'gi');
      if (regex.test(optimizedQuery)) {
        optimizedQuery += ` ${acronym.full_term}`;
        expandedAcronyms.push({
          acronym: acronym.acronym,
          fullTerm: acronym.full_term,
        });
      }
    }
  }

  if (synonyms && synonyms.length > 0) {
    for (const synonym of synonyms) {
      const regex = new RegExp(`\\b${synonym.term}\\b`, 'gi');
      if (regex.test(optimizedQuery)) {
        const syns = synonym.synonyms.join(' ');
        optimizedQuery += ` ${syns}`;
        addedSynonyms.push(...synonym.synonyms);
      }
    }
  }

  return {
    optimizedQuery,
    addedSynonyms,
    expandedAcronyms,
  };
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&aelig;': '�',
    '&AElig;': '�',
    '&oslash;': '�',
    '&Oslash;': '�',
    '&aring;': '�',
    '&Aring;': '�',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&mdash;': '',
    '&ndash;': '',
    '&hellip;': '...',
    '&sect;': '�',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return decoded;
}

async function handleOpenAPISpec(req: Request) {
  return new Response(
    JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'N�vneneshus Search API', version: '1.5.0' },
      paths: {}
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
