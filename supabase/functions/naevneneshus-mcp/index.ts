import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SearchRequest {
  query: string;
  originalQuery: string;
  page?: number;
  pageSize?: number;
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  console.log(`[${requestId}] 📥 ${method} ${path}`);

  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const mcpPortalMatch = path.match(/\/mcp\/([a-z0-9.-]+)$/);
    if (mcpPortalMatch && method === 'POST') {
      const portal = mcpPortalMatch[1];
      const body = await req.json();
      body.portal = portal;
      return await handleMCP(body, supabase);
    } else if (path.endsWith('/portals') && method === 'GET') {
      return await handlePortals();
    } else if (path.endsWith('/openapi.json') && method === 'GET') {
      return handleOpenAPISpec(req, supabase);
    } else if ((path === '/naevneneshus-mcp' || path === '/naevneneshus-mcp/') && method === 'GET') {
      return new Response(
        JSON.stringify({
          name: 'Nævneneshus Search API',
          version: '2.0.0',
          description: 'Simplified search API - AI handles query optimization',
          endpoints: {
            openapi: { path: '/openapi.json', method: 'GET' },
            portals: { path: '/portals', method: 'GET' },
            portalSearch: { path: '/mcp/{portal}', method: 'POST' }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (path.endsWith('/health') && method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString(), version: '2.0.0' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Not found', path }),
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

async function handleMCP(body: SearchRequest & { portal: string }, supabase: any) {
  const startTime = Date.now();
  const { query, originalQuery, portal, page = 1, pageSize = 5 } = body;

  if (!query || !originalQuery) {
    return new Response(
      JSON.stringify({
        error: 'Both query and originalQuery are required',
        example: {
          query: 'jordforurening forurenet jord',
          originalQuery: 'hvad siger reglerne om jordforurening?'
        }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiUrl = `https://${portal}/api/Search`;
    const payload = {
      query: query,
      parameters: {},
      sort: 1,
      skip: (page - 1) * pageSize,
      size: pageSize,
    };

    console.log(`🔍 Searching ${portal}:`);
    console.log(`  Original: "${originalQuery}"`);
    console.log(`  Optimized: "${query}"`);

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
      original_query: originalQuery,
      optimized_query: query,
      query: query,
      result_count: resultCount,
      execution_time_ms: executionTime,
      user_identifier: 'openwebui',
    });

    console.log(`✅ Found ${resultCount} results in ${executionTime}ms`);

    return new Response(
      JSON.stringify(formatResults(data, portal, executionTime, page, pageSize)),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;

    await supabase.from('query_logs').insert({
      portal,
      original_query: originalQuery,
      optimized_query: query,
      query: query,
      result_count: 0,
      execution_time_ms: executionTime,
      error_message: error.message,
      user_identifier: 'openwebui',
    });

    return new Response(
      JSON.stringify({ error: error.message, portal, originalQuery, query }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function formatResults(data: any, portal: string, executionTime: number, page: number, pageSize: number) {
  const total = data.totalCount || 0;
  const publications = data.publications || [];
  const categoryCounts = data.categoryCounts || [];

  if (total === 0) {
    return {
      success: true,
      portal,
      totalCount: 0,
      results: [],
      executionTime,
      message: 'Ingen resultater fundet'
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
    '&aelig;': 'æ',
    '&AElig;': 'Æ',
    '&oslash;': 'ø',
    '&Oslash;': 'Ø',
    '&aring;': 'å',
    '&Aring;': 'Å',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '...',
    '&sect;': '§',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return decoded;
}

async function handleOpenAPISpec(req: Request, supabase: any) {
  console.log('📖 Generating OpenAPI spec with metadata...');

  const { data: portals, error: portalsError } = await supabase
    .from('portal_metadata')
    .select('portal, name, domain_focus')
    .order('portal');

  if (portalsError) {
    console.error('Failed to fetch portals:', portalsError.message);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch portal metadata' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const portalList = portals?.map(p => p.portal) || [];

  const [categoriesResult, legalAreasResult, acronymsResult, synonymsResult] = await Promise.all([
    supabase.from('site_categories').select('portal, category_title, aliases').in('portal', portalList),
    supabase.from('legal_areas').select('portal, area_name').in('portal', portalList),
    supabase.from('portal_acronyms').select('portal, acronym, full_term').in('portal', portalList),
    supabase.from('query_synonyms').select('portal, term, synonyms').in('portal', portalList)
  ]);

  const categoriesByPortal = new Map<string, Array<{title: string, aliases: string[]}>>();
  const legalAreasByPortal = new Map<string, string[]>();
  const acronymsByPortal = new Map<string, Array<{acronym: string, full_term: string}>>();
  const synonymsByPortal = new Map<string, Array<{term: string, synonyms: string[]}>>();

  categoriesResult.data?.forEach(c => {
    if (!categoriesByPortal.has(c.portal)) categoriesByPortal.set(c.portal, []);
    categoriesByPortal.get(c.portal)!.push({title: c.category_title, aliases: c.aliases || []});
  });

  legalAreasResult.data?.forEach(a => {
    if (!legalAreasByPortal.has(a.portal)) legalAreasByPortal.set(a.portal, []);
    legalAreasByPortal.get(a.portal)!.push(a.area_name);
  });

  acronymsResult.data?.forEach(a => {
    if (!acronymsByPortal.has(a.portal)) acronymsByPortal.set(a.portal, []);
    acronymsByPortal.get(a.portal)!.push({acronym: a.acronym, full_term: a.full_term});
  });

  synonymsResult.data?.forEach(s => {
    if (!synonymsByPortal.has(s.portal)) synonymsByPortal.set(s.portal, []);
    synonymsByPortal.get(s.portal)!.push({term: s.term, synonyms: s.synonyms || []});
  });

  const paths: any = {};
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  for (const portalMeta of (portals || [])) {
    const operationId = `search_${portalMeta.portal.replace(/[^a-z0-9]/gi, '_')}`;
    const categories = categoriesByPortal.get(portalMeta.portal) || [];
    const legalAreas = legalAreasByPortal.get(portalMeta.portal) || [];
    const acronyms = acronymsByPortal.get(portalMeta.portal) || [];
    const synonyms = synonymsByPortal.get(portalMeta.portal) || [];

    let description = `DU ER SØGEASSISTENT FOR ${portalMeta.name || portalMeta.portal}

METADATA:
- Portal: ${portalMeta.portal}
- Fokusområde: ${portalMeta.domain_focus || 'Administrative afgørelser'}

LOVOMRÅDER: ${legalAreas.slice(0, 10).join(', ') || 'Ingen specificeret'}

KATEGORIER (med aliases):
${categories.slice(0, 15).map(c => `- ${c.title}${c.aliases.length > 0 ? ` (aliases: ${c.aliases.join(', ')})` : ''}`).join('\n') || '- Ingen kategorier'}

AKRONYMER:
${acronyms.slice(0, 10).map(a => `- ${a.acronym} → ${a.full_term}`).join('\n') || '- Ingen akronymer'}

SYNONYMER:
${synonyms.slice(0, 10).map(s => `- ${s.term} → ${s.synonyms.join(', ')}`).join('\n') || '- Ingen synonymer'}

OPGAVE - QUERY OPTIMERING:
1. Analyser brugerens spørgsmål (originalQuery)
2. Identificer kernesøgeord
3. Ekspander akronymer baseret på listen ovenfor
4. Tilføj relevante synonymer baseret på listen ovenfor
5. Fjern filler words: og, eller, i, på, for, af, at, der, det, den, de, en, et, som, med, til, ved, om
6. Ret stavefejl hvis muligt
7. Konverter til effektiv søgestreng

EKSEMPLER:
Bruger: "hvad siger reglerne om jordforurening?"
→ query: "jordforurening regler"

Bruger: "MBL § 72 om støj"
→ query: "Miljøbeskyttelsesloven § 72 støj"

Bruger: "praksis om byggetilladelse i landzone"
→ query: "byggetilladelse landzone"

FUNKTIONSKALD:
Send ALTID både originalQuery (brugerens præcise input) og query (din optimerede version).

EFTER RESULTAT:
Generer 50-100 ords dansk resume baseret på:
- Resultaternes body tekst (hovedindhold)
- Kategorier og mønstre på tværs af resultater
- Vigtigste juridiske fund og konklusioner
- Dato og relevans for brugerens spørgsmål`;

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
                required: ['query', 'originalQuery'],
                properties: {
                  query: {
                    type: 'string',
                    description: 'AI-optimeret søgestreng (med synonymer, akronymer ekspanderet, uden filler words)',
                    example: 'jordforurening forurenet jord grund',
                  },
                  originalQuery: {
                    type: 'string',
                    description: 'Brugerens originale input (uændret)',
                    example: 'hvad siger reglerne om jordforurening?',
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
                    success: { type: 'boolean' },
                    portal: { type: 'string' },
                    totalCount: { type: 'integer' },
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
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
                          link: { type: 'string', format: 'uri' },
                          body: { type: 'string', description: 'Clean text uden HTML' },
                          abstract: { type: 'string' }
                        }
                      }
                    },
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
                    },
                    executionTime: { type: 'integer' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Ugyldig forespørgsel - mangler query eller originalQuery'
          },
          '500': {
            description: 'Serverfejl'
          }
        }
      }
    };
  }

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Nævneneshus Search API',
      version: '2.0.0',
      description: 'Simplified search API where AI handles query optimization. Each portal has metadata-driven prompts with categories, acronyms, and synonyms.',
    },
    servers: [
      {
        url: `${supabaseUrl}/functions/v1/naevneneshus-mcp`,
        description: 'Supabase Edge Function',
      },
    ],
    paths: {
      ...paths,
      '/portals': {
        get: {
          summary: 'List available portals',
          operationId: 'listPortals',
          responses: {
            '200': {
              description: 'List of portals',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      portals: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Optional Supabase anon key',
        },
      },
    },
    security: [],
  };

  console.log(`✅ Generated spec with ${Object.keys(paths).length} portal tools`);

  return new Response(JSON.stringify(spec), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
