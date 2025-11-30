import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Api-Key",
};

interface SearchRequest {
  portal: string;
  query: string;
  originalQuery?: string;
  page?: number;
  pageSize?: number;
  filters?: {
    category?: string;
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
  detectedAcronyms?: Array<{
    acronym: string;
    context: string;
  }>;
}

interface FeedRequest {
  portal: string;
  page?: number;
  pageSize?: number;
}

interface DetailRequest {
  portal: string;
  id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);
  
  // Serve OpenAPI spec at /openapi.json
  if (url.pathname.endsWith('/openapi.json')) {
    return new Response(JSON.stringify(getOpenAPISpec(), null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  try {
    let operation: string;
    let params: any;

    // Handle both GET and POST requests
    if (req.method === "GET") {
      operation = url.searchParams.get('operation') || 'listPortals';
      
      // Parse params from URL
      params = {};
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'operation') {
          params[key] = value;
        }
      }
      
      console.log('GET request - Operation:', operation, 'Params:', params);
    } else {
      // POST request
      const bodyText = await req.text();
      console.log('POST - Raw body:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      
      const parsed = JSON.parse(bodyText);
      operation = parsed.operation;
      params = parsed;
      delete params.operation;
      
      console.log('POST request - Operation:', operation, 'Params:', params);
    }

    let result;
    switch (operation) {
      case "searchPortal":
        result = await searchPortal(params as SearchRequest);
        break;
      case "getLatestPublications":
        result = await getLatestPublications(params as FeedRequest);
        break;
      case "getPublicationDetail":
        result = await getPublicationDetail(params as DetailRequest);
        break;
      case "listPortals":
        result = await listPortals();
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function getOpenAPISpec() {
  return {
    "openapi": "3.1.0",
    "info": {
      "title": "Nævneneshus MCP Search API",
      "description": "API til søgning i Danmarks administrative klage- og ankesystem. Søg i afgørelser fra Miljø- og Fødevareklagenævnet (MFKN) og andre nævn. Understøtter intelligent query optimering, kategoridetektion og akronymhåndtering.",
      "version": "1.0.0"
    },
    "servers": [
      {
        "url": "https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp",
        "description": "Production server"
      }
    ],
    "paths": {
      "/": {
        "post": {
          "operationId": "searchPortal",
          "summary": "Søg i afgørelser fra nævn",
          "description": "Søg i afgørelser med intelligent query optimering. API'et detekterer automatisk kategorier fra akronymer (f.eks. MBL, NBL) og optimerer søgetermer ved at fjerne stopwords og redundans.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["operation", "portal", "query"],
                  "properties": {
                    "operation": {
                      "type": "string",
                      "enum": ["searchPortal"],
                      "description": "Operation type"
                    },
                    "portal": {
                      "type": "string",
                      "enum": ["mfkn.naevneneshus.dk"],
                      "description": "Portal domæne (brug 'mfkn.naevneneshus.dk' for Miljø- og Fødevareklagenævnet)"
                    },
                    "query": {
                      "type": "string",
                      "description": "Søgetekst. Kan indeholde akronymer (MBL, NBL), paragrafhenvisninger (§ 72), eller fulde termer. API'et optimerer automatisk."
                    },
                    "page": {
                      "type": "integer",
                      "default": 1,
                      "description": "Side nummer for pagination"
                    },
                    "pageSize": {
                      "type": "integer",
                      "default": 10,
                      "description": "Antal resultater per side"
                    }
                  }
                },
                "examples": {
                  "miljøbeskyttelse": {
                    "summary": "Søg med akronym (MBL)",
                    "value": {
                      "operation": "searchPortal",
                      "portal": "mfkn.naevneneshus.dk",
                      "query": "Bevisbyrde ved MBL § 72"
                    }
                  },
                  "naturbeskyttelse": {
                    "summary": "Søg i naturbeskyttelsesloven",
                    "value": {
                      "operation": "searchPortal",
                      "portal": "mfkn.naevneneshus.dk",
                      "query": "NBL § 3 strandbeskyttelse"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Succesfuld søgning",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "success": {
                        "type": "boolean"
                      },
                      "portal": {
                        "type": "string"
                      },
                      "query": {
                        "type": "string",
                        "description": "Optimeret søgequery"
                      },
                      "originalQuery": {
                        "type": "string",
                        "description": "Original søgequery"
                      },
                      "results": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "id": {"type": "string"},
                            "title": {"type": "string"},
                            "abstract": {"type": "string"},
                            "publicationDate": {"type": "string"},
                            "caseNumber": {"type": "string"},
                            "categories": {"type": "array", "items": {"type": "string"}},
                            "url": {"type": "string"}
                          }
                        }
                      },
                      "totalCount": {
                        "type": "integer"
                      },
                      "page": {
                        "type": "integer"
                      },
                      "pageSize": {
                        "type": "integer"
                      },
                      "executionTime": {
                        "type": "integer",
                        "description": "Eksekveringstid i millisekunder"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}

async function searchPortal(request: SearchRequest) {
  const startTime = Date.now();
  const { portal, query, originalQuery, page = 1, pageSize = 10, filters, detectedAcronyms } = request;

  if (!portal || !query) {
    throw new Error('Missing required parameters: portal and query');
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Detect categories from acronyms in the query
    const detectedCategory = await detectCategoryFromQuery(supabase, portal, query);

    // Merge detected category with existing filters
    const mergedFilters = {
      ...filters,
      category: detectedCategory || filters?.category,
    };

    // Optimize the query further (removes stopwords and category acronyms)
    const optimizedQuery = await optimizeQuery(supabase, portal, query);

    const searchPayload = buildSearchPayload(optimizedQuery, page, pageSize, mergedFilters);
    const searchUrl = `https://${portal}/api/Search`;

    console.log('Calling search API:', searchUrl);
    console.log('Search payload:', JSON.stringify(searchPayload));

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "MCP-Server/1.0",
      },
      body: JSON.stringify(searchPayload),
    });

    if (!response.ok) {
      throw new Error(`Portal returned ${response.status}`);
    }

    const data = await response.json();
    const results = parseSearchResults(data, portal);
    const executionTime = Date.now() - startTime;

    // Log the query with optimization tracking and payload/response
    await logQuery(supabase, {
      portal,
      query,
      original_query: originalQuery || query,
      optimized_query: optimizedQuery !== query ? optimizedQuery : null,
      result_count: results.totalCount,
      execution_time_ms: executionTime,
      search_payload: searchPayload,
      api_response: {
        totalCount: data.TotalCount,
        itemCount: data.Items?.length || 0,
        firstItemTitle: data.Items?.[0]?.Title || null,
        detectedCategory: detectedCategory || null,
      },
    });

    // Auto-detect acronyms if not provided
    let acronymsToLog = detectedAcronyms;
    if (!acronymsToLog || acronymsToLog.length === 0) {
      acronymsToLog = detectAcronyms(query);
    }

    // Log detected acronyms
    if (acronymsToLog && acronymsToLog.length > 0) {
      await logAcronyms(supabase, portal, acronymsToLog);
    }

    return {
      success: true,
      portal,
      query: optimizedQuery,
      originalQuery: originalQuery || query,
      results: results.results,
      totalCount: results.totalCount,
      page,
      pageSize,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    await logQuery(supabase, {
      portal,
      query,
      original_query: originalQuery || query,
      result_count: 0,
      execution_time_ms: executionTime,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

async function getLatestPublications(request: FeedRequest) {
  const { portal, page = 1, pageSize = 10 } = request;

  if (!portal) {
    throw new Error('Missing required parameter: portal');
  }

  const feedUrl = `https://${portal}/api/feed`;
  const response = await fetch(feedUrl, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "MCP-Server/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Portal returned ${response.status}`);
  }

  const data = await response.json();
  const results = parseSearchResults(data, portal);

  // Implement pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedResults = results.results.slice(start, end);

  return {
    success: true,
    portal,
    results: paginatedResults,
    totalCount: results.totalCount,
    page,
    pageSize,
  };
}

async function getPublicationDetail(request: DetailRequest) {
  const { portal, id } = request;

  if (!portal || !id) {
    throw new Error('Missing required parameters: portal and id');
  }

  const detailUrl = `https://${portal}/api/publication/${id}`;
  const response = await fetch(detailUrl, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "MCP-Server/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Portal returned ${response.status}`);
  }

  const data = await response.json();

  return {
    success: true,
    portal,
    id,
    title: data.Title,
    body: cleanHtml(data.Body),
    publicationDate: data.PublicationDate,
    caseNumber: data.CaseNumber,
    categories: data.Categories || [],
    url: `https://${portal}/${id}`,
  };
}

async function listPortals() {
  const portals = [
    {
      domain: "mfkn.naevneneshus.dk",
      name: "Miljø- og Fødevareklagenævnet",
      description: "Klageinstans for miljø- og fødevareområdet",
      categories: [
        "Miljøbeskyttelse",
        "Naturbeskyttelse",
        "Jordforurening",
        "Vandløb",
      ],
    },
  ];

  return {
    success: true,
    portals,
  };
}

function buildSearchPayload(query: string, page: number, pageSize: number, filters?: any) {
  const skip = (page - 1) * pageSize;
  return {
    term: query,
    skip,
    take: pageSize,
    sort: filters?.sort ?? 0,
    categories: filters?.category ? [filters.category] : [],
  };
}

function parseSearchResults(data: any, portal: string) {
  const items = data.Items || [];
  const totalCount = data.TotalCount || 0;

  const results = items.map((item: any) => ({
    id: item.Id,
    title: item.Title,
    abstract: cleanHtml(item.Abstract || ""),
    publicationDate: item.PublicationDate,
    caseNumber: item.CaseNumber,
    categories: item.Categories || [],
    url: `https://${portal}/${item.Id}`,
  }));

  return {
    results,
    totalCount,
  };
}

function cleanHtml(html: string): string {
  if (!html) return "";

  return html
    .replace(/<\/p>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<li>/g, "\n• ")
    .replace(/<\/li>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

async function detectCategoryFromQuery(supabase: any, portal: string, query: string): Promise<string | null> {
  try {
    const { data: categories } = await supabase
      .from('site_categories')
      .select('category_id, category_title, aliases')
      .eq('portal', portal);

    if (!categories || categories.length === 0) return null;

    const queryLower = query.toLowerCase();
    const queryUpper = query.toUpperCase();
    const queryWords = query.split(/\s+/);

    for (const category of categories) {
      const aliases = category.aliases || [];

      for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        const aliasUpper = alias.toUpperCase();

        const isAcronymMatch = queryWords.some(word =>
          word.toUpperCase() === aliasUpper && /^[A-ZÆØÅ]+$/.test(alias)
        );

        const isFullNameMatch = queryLower.includes(aliasLower) && alias.length > 3;

        if (isAcronymMatch || isFullNameMatch) {
          console.log(`Detected category: ${category.category_title} (matched: "${alias}") -> ${category.category_id}`);
          return category.category_id;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to detect category:', error);
    return null;
  }
}

async function optimizeQuery(supabase: any, portal: string, query: string): Promise<string> {
  try {
    const stopwords = [
      'praksis', 'afgørelse', 'afgørelser', 'kendelse', 'kendelser',
      'dom', 'domme', 'sag', 'sager', 'om', 'ved', 'for', 'til',
      'søgning', 'søg', 'find', 'finde', 'vise', 'vis', 'alle',
      'og', 'eller', 'samt'
    ];

    const { data: categories } = await supabase
      .from('site_categories')
      .select('aliases')
      .eq('portal', portal);

    const categoryTerms = new Set<string>();
    if (categories) {
      categories.forEach((cat: any) => {
        (cat.aliases || []).forEach((alias: string) => {
          categoryTerms.add(alias.toLowerCase());
          categoryTerms.add(alias.toUpperCase());
        });
      });
    }

    let optimized = query;
    for (const term of categoryTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      optimized = optimized.replace(regex, '');
    }

    let words = optimized.split(/\s+/).filter(w => w.length > 0);
    words = words.filter(word => {
      const cleanWord = word.replace(/[.,!?;:]$/, '').toLowerCase();
      return !stopwords.includes(cleanWord);
    });

    words = words.filter((word, index, arr) => {
      if (word.includes('§')) {
        const baseNum = word.match(/§\s*\d+/)?.[0];
        if (baseNum) {
          const isDuplicate = arr.some((other, otherIndex) =>
            otherIndex !== index &&
            other.includes('§') &&
            other.match(/§\s*\d+/)?.[0] === baseNum &&
            other.length < word.length
          );
          return !isDuplicate;
        }
      }
      return true;
    });

    optimized = words.join(' ').trim();

    return optimized.length > 0 ? optimized : query;
  } catch (error) {
    console.error('Failed to optimize query:', error);
    return query;
  }
}

async function logQuery(supabase: any, data: any) {
  try {
    const logData: any = {
      portal: data.portal,
      query: data.query,
      result_count: data.result_count,
      execution_time_ms: data.execution_time_ms,
    };

    if (data.original_query) logData.original_query = data.original_query;
    if (data.optimized_query) logData.optimized_query = data.optimized_query;
    if (data.error_message) logData.error_message = data.error_message;
    if (data.search_payload) logData.search_payload = data.search_payload;
    if (data.api_response) logData.api_response = data.api_response;

    await supabase.from("query_logs").insert(logData);
  } catch (error) {
    console.error("Failed to log query:", error);
  }
}

function detectAcronyms(text: string): Array<{ acronym: string; context: string }> {
  const acronymPattern = /\b[A-ZÆØÅ]{2,}\b/g;
  const matches = text.match(acronymPattern) || [];
  const unique = [...new Set(matches)];

  return unique.map((acronym) => ({
    acronym,
    context: text,
  }));
}

async function logAcronyms(supabase: any, portal: string, acronyms: Array<{ acronym: string; context: string }>) {
  try {
    const suggestions = acronyms.map((item) => ({
      portal,
      suggestion_type: "acronym",
      value: item.acronym,
      context: item.context,
      frequency: 1,
    }));

    await supabase.from("metadata_suggestions").insert(suggestions);
  } catch (error) {
    console.error("Failed to log acronyms:", error);
  }
}
