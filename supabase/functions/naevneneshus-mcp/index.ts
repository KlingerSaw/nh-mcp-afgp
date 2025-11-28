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

interface SiteSettingsRequest {
  portal: string;
}

const DEFAULT_PORTALS = [
  'mfkn.naevneneshus.dk',
  'aen.naevneneshus.dk',
  'ekn.naevneneshus.dk',
  'pn.naevneneshus.dk',
];

function parseQueryWithCategories(queryString: string): { cleanQuery: string; categoryTitles: string[] } {
  const categoryRegex = /,?\s*kategori:\s*([^,\n]+)/gi;
  const categoryTitles: string[] = [];
  let match;

  while ((match = categoryRegex.exec(queryString)) !== null) {
    categoryTitles.push(match[1].trim());
  }

  let cleanQuery = queryString.replace(categoryRegex, '').trim();

  cleanQuery = cleanQuery.replace(/\s+(AND|OR)\s*$/i, '').trim();
  cleanQuery = cleanQuery.replace(/^\s*(AND|OR)\s+/i, '').trim();

  cleanQuery = cleanQuery.replace(/,\s*$/, '').trim();
  cleanQuery = cleanQuery.replace(/^\s*,/, '').trim();

  cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

  return { cleanQuery, categoryTitles };
}

async function resolveCategoryIds(portal: string, categoryTitles: string[], supabase: any): Promise<CategoryFilter[]> {
  if (categoryTitles.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('site_categories')
    .select('category_id, category_title')
    .eq('portal', portal)
    .in('category_title', categoryTitles);

  if (error || !data) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data.map((cat: any) => ({
    id: cat.category_id,
    title: cat.category_title,
  }));
}

async function expandAcronyms(query: string, portal: string, supabase: any): Promise<string> {
  const { data: acronyms } = await supabase
    .from('portal_acronyms')
    .select('acronym, full_term')
    .eq('portal', portal);

  if (!acronyms || acronyms.length === 0) {
    return query;
  }

  let expandedQuery = query;
  for (const { acronym, full_term } of acronyms) {
    const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
    if (regex.test(expandedQuery)) {
      expandedQuery = expandedQuery.replace(regex, `${acronym} ${full_term}`);
    }
  }

  return expandedQuery;
}

async function addSynonyms(query: string, portal: string, supabase: any): Promise<string> {
  const { data: synonyms } = await supabase
    .from('portal_synonyms')
    .select('term, synonyms')
    .eq('portal', portal);

  if (!synonyms || synonyms.length === 0) {
    return query;
  }

  const words = query.toLowerCase().split(/\s+/);
  const additions: string[] = [];

  for (const { term, synonyms: syns } of synonyms) {
    if (words.some(w => w.includes(term)) || words.includes(term)) {
      additions.push(...syns);
    }

    for (const syn of syns) {
      if (words.includes(syn)) {
        additions.push(term);
        additions.push(...syns.filter((s: string) => s !== syn));
        break;
      }
    }
  }

  if (additions.length > 0) {
    return `${query} ${[...new Set(additions)].join(' ')}`;
  }

  return query;
}

async function optimizeQuery(query: string, portal: string, supabase: any): Promise<string> {
  let optimized = query;

  optimized = await expandAcronyms(optimized, portal, supabase);

  optimized = await addSynonyms(optimized, portal, supabase);

  return optimized;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const mcpPortalMatch = path.match(/\/mcp\/([a-z0-9.-]+)$/);
    if (mcpPortalMatch && req.method === 'POST') {
      const portal = mcpPortalMatch[1];
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
      return handleOpenAPISpec(req);
    } else if (path.endsWith('/health') && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.1.0',
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
      'Error: Invalid JSON in request body. Expected format: {"query": "your search", "portal": "mfkn.naevneneshus.dk"}',
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
    );
  }

  const { query, portal = 'mfkn.naevneneshus.dk', page = 1, pageSize = 5 } = body;

  if (!query) {
    return new Response(
      'Error: "query" parameter is required. Example: {"query": "jordforurening"}',
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
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
      user_identifier: 'mcp-client',
    });

    const formattedResult = formatMCPResults(data, portal, cleanQuery, executionTime);

    return new Response(formattedResult, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
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
      user_identifier: 'mcp-client',
    });

    return new Response(
      `Error: ${error.message}`,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
    );
  }
}

function formatMCPResults(data: any, portal: string, query: string, executionTime: number): string {
  const total = data.totalCount || 0;
  const publications = data.publications || [];

  if (total === 0) {
    return `\ud83d\udd0d Ingen resultater fundet for "${query}" p\u00e5 ${portal}\n\n\ud83d\udca1 Pr\u00f8v:\n- Brug andre s\u00f8geord\n- Fjern datofiltre\n- Tjek stavning`;
  }

  const lines: string[] = [
    `\ud83d\udccb Fandt ${total} resultater for "${query}"`,
    `\ud83c\udf10 Portal: ${portal}`,
    `\u23f1\ufe0f S\u00f8getid: ${executionTime}ms`,
    '',
  ];

  const categoryCounts = data.categoryCounts || [];
  if (categoryCounts.length > 0) {
    lines.push('\ud83d\udcca Kategorier:');
    for (const cat of categoryCounts.slice(0, 5)) {
      lines.push(`   \u2022 ${cat.category}: ${cat.count}`);
    }
    lines.push('');
  }

  lines.push(`\ud83d\udcc4 Viser ${publications.length} resultater:`);
  lines.push('\u2500'.repeat(60));

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
      lines.push(`   \ud83d\udcd1 ${categories.join(', ')}`);
    }

    if (jnr.length > 0) {
      lines.push(`   \ud83d\udccb Journal: ${jnr.join(', ')}`);
    }

    lines.push(`   \ud83d\udcc5 Dato: ${date}`);
    lines.push(`   \ud83d\udd17 ${link}`);
  }

  if (total > publications.length) {
    const nextPage = Math.floor((data.skip || 0) / (data.size || 10)) + 2;
    lines.push('');
    lines.push('\u2500'.repeat(60));
    lines.push(`\ud83d\udca1 Viser ${publications.length} af ${total} resultater. Brug page=${nextPage} for flere.`);
  }

  return lines.join('\n');
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

  const { portal, query, categories = [], sort = 'Score', types = [], skip = 0, size = 10, userIdentifier, originalQuery } = body;

  if (!portal || !query) {
    return new Response(
      JSON.stringify({ error: 'Portal and query are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/Search`;
    const payload = {
      categories,
      query,
      sort,
      types,
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
      query: originalQuery || query,
      filters: { categories, sort, types },
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
      query: originalQuery || query,
      filters: { categories, sort, types },
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

async function handleOpenAPISpec(req: Request) {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}${url.pathname.replace('/openapi.json', '')}`;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: portals } = await supabase
    .from('portal_metadata')
    .select('portal, name, domain_focus')
    .order('portal');

  const paths: any = {};

  if (portals && portals.length > 0) {
    for (const portalMeta of portals) {
      const { data: categories } = await supabase
        .from('site_categories')
        .select('category_title')
        .eq('portal', portalMeta.portal)
        .limit(10);

      const { data: legalAreas } = await supabase
        .from('legal_areas')
        .select('area_name')
        .eq('portal', portalMeta.portal)
        .limit(10);

      const { data: acronyms } = await supabase
        .from('portal_acronyms')
        .select('acronym, full_term')
        .eq('portal', portalMeta.portal)
        .limit(5);

      const operationId = `search_${portalMeta.portal.replace(/[^a-z0-9]/gi, '_')}`;
      const categoryList = categories?.map(c => c.category_title).join(', ') || '';
      const legalAreaList = legalAreas?.map(a => a.area_name).join(', ') || '';
      const acronymList = acronyms?.map(a => `${a.acronym} (${a.full_term})`).join(', ') || '';

      let description = `Søg i ${portalMeta.name || portalMeta.portal}`;
      if (legalAreaList) {
        description += `\n\nLovområder: ${legalAreaList}`;
      }
      if (categoryList) {
        description += `\n\nTop kategorier: ${categoryList}`;
      }
      if (acronymList) {
        description += `\n\nAlmindelige akronymer: ${acronymList}`;
      }

      paths[`/mcp/${portalMeta.portal}`] = {
        post: {
          summary: `Søg i ${portalMeta.name || portalMeta.portal}`,
          description,
          operationId,
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
                      description: 'Søgeord på dansk. Systemet ekspanderer automatisk akronymer og synonymer.',
                    },
                    page: {
                      type: 'integer',
                      description: 'Side nummer (standard: 1)',
                      default: 1,
                    },
                    pageSize: {
                      type: 'integer',
                      description: 'Antal resultater per side (standard: 5)',
                      default: 5,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Søgning gennemført',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                    description: 'Formateret tekst med søgeresultater',
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
      version: '1.1.0',
      description: 'Søg i danske administrative afgørelser på tværs af flere portaler. Hvert portal har sit eget endpoint med optimeret søgning baseret på lovområder, kategorier og akronymer.',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Supabase Edge Function',
      },
    ],
    paths: {
      ...paths,
      '/search': {
        post: {
          summary: 'Search publications',
          description: 'Search for administrative rulings and publications across Danish portals',
          operationId: 'searchPublications',
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
                            categories: {
                              type: 'array',
                              items: { type: 'string' },
                            },
                            jnr: {
                              type: 'array',
                              items: { type: 'string' },
                            },
                            type: {
                              type: 'string',
                              enum: ['ruling', 'news'],
                            },
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
          description: 'Get list of all available N\u00e6vneneshus portals',
          operationId: 'listPortals',
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
          description: 'Supabase anon key for authentication',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
