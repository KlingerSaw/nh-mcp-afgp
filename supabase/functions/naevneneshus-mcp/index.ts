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

      // If operation is specified, use it; otherwise default to searchPortal for Open WebUI compatibility
      operation = parsed.operation || 'searchPortal';
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
      "title": "Afgp",
      "description": "Søg i afgørelser fra Miljø- og Fødevareklagenævnet (MFKN). API'et håndterer automatisk kategoridetektion og query optimering.",
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
          "operationId": "Afgp",
          "summary": "Søg i afgørelser",
          "description": "Søg i afgørelser med automatisk kategoridetektion fra akronymer (MBL, NBL, etc.) og query optimering.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["query"],
                  "properties": {
                    "portal": {
                      "type": "string",
                      "enum": ["mfkn.naevneneshus.dk"],
                      "default": "mfkn.naevneneshus.dk",
                      "description": "Portal domæne"
                    },
                    "query": {
                      "type": "string",
                      "description": "Søgetekst. Kan indeholde akronymer (MBL, NBL) og paragrafhenvisninger (§ 72)."
                    }
                  }
                },
                "examples": {
                  "miljøbeskyttelse": {
                    "summary": "Søg med akronym (MBL)",
                    "value": {
                      "query": "Bevisbyrde ved MBL § 72"
                    }
                  },
                  "naturbeskyttelse": {
                    "summary": "Søg i naturbeskyttelsesloven",
                    "value": {
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
                            "highlights": {"type": "array", "items": {"type": "string"}},
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

  // Handle both direct params and nested pagination object (Open WebUI format)
  const pagination = (request as any).pagination || {};
  const portal = request.portal || 'mfkn.naevneneshus.dk';
  const query = request.query;
  const originalQuery = request.originalQuery;
  const page = pagination.page || request.page || 1;
  const pageSize = pagination.pageSize || request.pageSize || 10;
  const filters = request.filters;
  const detectedAcronyms = request.detectedAcronyms;

  if (!query) {
    throw new Error('Missing required parameter: query');
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Detect categories from acronyms in the query
    const detectedCategoryInfo = await detectCategoryFromQuery(supabase, portal, query);

    // Merge detected category with existing filters
    const mergedFilters = {
      ...filters,
      category: detectedCategoryInfo?.id || filters?.category,
      categoryTitle: detectedCategoryInfo?.title || filters?.categoryTitle,
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
        totalCount: data.totalCount || data.TotalCount,
        itemCount: (data.publications || data.Items || []).length,
        firstItemTitle: data.publications?.[0]?.title || data.Items?.[0]?.Title || null,
        detectedCategory: detectedCategoryInfo?.id || null,
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

  const payload: any = {
    term: query,
    skip,
    take: pageSize,
    sort: filters?.sort ?? 0,
    parameters: [],
  };

  // Only include category if it's a valid UUID (not strings like "ruling")
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (filters?.category && isValidUUID.test(filters.category)) {
    payload.categories = [{
      id: filters.category,
      title: filters.categoryTitle || ''
    }];
  } else {
    payload.categories = [];
  }

  return payload;
}

function parseSearchResults(data: any, portal: string) {
  const items = data.publications || data.Items || [];
  const totalCount = data.totalCount || data.TotalCount || 0;

  const results = items.map((item: any) => ({
    id: item.id || item.Id,
    title: item.title || item.Title,
    abstract: cleanHtml(item.abstract || item.Abstract || ""),
    highlights: item.highlights || [],
    publicationDate: item.published_date || item.publicationDate || item.PublicationDate,
    caseNumber: item.jnr?.[0] || item.caseNumber || item.CaseNumber,
    categories: item.categories || item.Categories || [],
    url: `https://${portal}/${item.id || item.Id}`,
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

async function detectCategoryFromQuery(supabase: any, portal: string, query: string): Promise<{ id: string; title: string } | null> {
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
          return {
            id: category.category_id,
            title: category.category_title
          };
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
      'og', 'eller', 'samt', 'i', 'af', 'på', 'med', 'fra'
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

    // Remove duplicate paragraph references before splitting into words
    const seenParagraphs = new Set<string>();
    const paragraphPattern = /§\s*\d+(?:-[^\s]+)?/g;

    optimized = optimized.replace(paragraphPattern, (match) => {
      const baseNum = match.match(/§\s*\d+/)?.[0].replace(/\s+/g, ' ');
      if (!baseNum) return match;

      if (seenParagraphs.has(baseNum)) {
        return ''; // Remove duplicate
      }

      seenParagraphs.add(baseNum);

      // Check if this paragraph reference has a compound with stopword (e.g., § 72-praksis)
      const parts = match.split('-');
      if (parts.length > 1) {
        const suffix = parts[1].replace(/[.,!?;:]$/, '').toLowerCase();
        if (stopwords.includes(suffix)) {
          return baseNum; // Keep only the base paragraph number, remove the stopword compound
        }
      }

      return match;
    });

    let words = optimized.split(/\s+/).filter(w => w.length > 0);

    // Filter remaining words: remove stopwords and compound words with stopwords
    words = words.filter(word => {
      const cleanWord = word.replace(/[.,!?;:\-]$/, '').toLowerCase();
      const baseWord = cleanWord.split('-')[0];

      // Check if any part of a compound word (separated by hyphen) is a stopword
      const parts = word.split('-');
      const hasStopwordPart = parts.some(part => {
        const cleanPart = part.replace(/[.,!?;:]$/, '').toLowerCase();
        return stopwords.includes(cleanPart);
      });

      // If the word contains a stopword part, skip it entirely
      if (stopwords.includes(cleanWord) || stopwords.includes(baseWord) || hasStopwordPart) {
        return false;
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
