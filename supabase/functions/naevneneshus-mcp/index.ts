import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

interface PublicationRequest {
  portal: string;
  publicationId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/naevneneshus-mcp/, "");

  try {
    if (path === "/openapi.json" && req.method === "GET") {
      const openapi = generateOpenAPISpec();
      return new Response(JSON.stringify(openapi, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (path === "/health" && req.method === "GET") {
      return new Response(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (path === "/portals" && req.method === "GET") {
      const portals = await getPortalsList();
      return new Response(JSON.stringify(portals), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (path === "/search" && req.method === "POST") {
      const body: SearchRequest = await req.json();
      const result = await searchPortal(body);
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (path === "/feed" && req.method === "POST") {
      const body: FeedRequest = await req.json();
      const result = await getPortalFeed(body);
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (path === "/publication" && req.method === "POST") {
      const body: PublicationRequest = await req.json();
      const result = await getPublicationDetail(body);
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});

async function searchPortal(request: SearchRequest) {
  const startTime = Date.now();
  const { portal, query, originalQuery, page = 1, pageSize = 10, filters, detectedAcronyms } = request;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Optimize the query further
    const optimizedQuery = await optimizeQuery(supabase, portal, query);

    const searchPayload = buildSearchPayload(optimizedQuery, page, pageSize, filters);
    const searchUrl = `https://${portal}/api/Search`;

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
      },
    });

    // Auto-detect acronyms if not provided
    let acronymsToLog = detectedAcronyms;
    if (!acronymsToLog || acronymsToLog.length === 0) {
      acronymsToLog = detectAcronyms(query);
    }

    // Log acronym suggestions
    if (acronymsToLog && acronymsToLog.length > 0) {
      await logAcronymSuggestions(supabase, portal, query, acronymsToLog);
    }

    return {
      success: true,
      portal,
      query,
      originalQuery: originalQuery || query,
      results: results.items,
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
      error_message: error.message,
    });

    throw error;
  }
}

async function getPortalFeed(request: FeedRequest) {
  const { portal, page = 1, pageSize = 10 } = request;

  const skip = (page - 1) * pageSize;
  const feedPayload = {
    term: "",
    skip,
    take: pageSize,
    sort: 0,
  };

  const feedUrl = `https://${portal}/api/Feed`;
  const response = await fetch(feedUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(feedPayload),
  });

  if (!response.ok) {
    throw new Error(`Portal returned ${response.status}`);
  }

  const data = await response.json();
  const results = parseSearchResults(data, portal);

  return {
    success: true,
    portal,
    results: results.items,
    totalCount: results.totalCount,
    page,
    pageSize,
  };
}

async function getPublicationDetail(request: PublicationRequest) {
  const { portal, publicationId } = request;
  const url = `https://${portal}/api/Publication/${publicationId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Portal returned ${response.status}`);
  }

  const data = await response.json();

  return {
    success: true,
    portal,
    publication: {
      id: data.Id,
      title: data.Title,
      date: data.Date,
      caseNumber: data.CaseNumber,
      summary: data.Summary,
      content: data.Content,
      categories: data.Categories || [],
      documentUrl: data.DocumentUrl,
    },
  };
}

async function getPortalsList() {
  const portals = [
    {
      domain: "mfkn.naevneneshus.dk",
      name: "Miljø- og Fødevareklagenævnet",
      description: "Afgørelser om miljø, natur, klima, landbrug og fødevarer",
    },
    {
      domain: "pkn.naevneneshus.dk",
      name: "Planklagenævnet",
      description: "Afgørelser om fysisk planlægning",
    },
    {
      domain: "ekn.naevneneshus.dk",
      name: "Ekspropriations- og Planklagenævnet",
      description: "Afgørelser om ekspropriation",
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
  const items = (data.Items || []).map((item: any) => ({
    id: item.Id,
    title: decodeHtml(item.Title || ""),
    excerpt: decodeHtml(item.Excerpt || ""),
    date: item.Date,
    caseNumber: item.CaseNumber,
    category: item.Category,
    url: `https://${portal}/Afgoerelser/Details/${item.Id}`,
  }));

  return {
    items,
    totalCount: data.TotalCount || 0,
  };
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

async function optimizeQuery(supabase: any, portal: string, query: string): Promise<string> {
  try {
    // Define stopwords - words that don't add search value
    const stopwords = [
      'praksis', 'afgørelse', 'afgørelser', 'kendelse', 'kendelser',
      'dom', 'domme', 'sag', 'sager', 'om', 'ved', 'om', 'for', 'til',
      'søgning', 'find', 'vise', 'vis', 'alle'
    ];

    // Get all portal_acronyms for this portal to identify category acronyms
    const { data: acronyms } = await supabase
      .from('portal_acronyms')
      .select('acronym, full_term')
      .eq('portal', portal);

    const knownAcronyms = new Set((acronyms || []).map((a: any) => a.acronym.toUpperCase()));

    // Split query into words
    let words = query.split(/\s+/);

    // Remove stopwords and category acronyms
    words = words.filter(word => {
      const cleanWord = word.replace(/[.,!?;:]$/, '').toLowerCase();
      const upperWord = word.replace(/[.,!?;:]$/, '').toUpperCase();

      // Keep if it's not a stopword and not a known category acronym
      return !stopwords.includes(cleanWord) && !knownAcronyms.has(upperWord);
    });

    const optimized = words.join(' ').trim();

    // Return optimized query or original if optimization made it empty
    return optimized.length > 0 ? optimized : query;
  } catch (error) {
    console.error('Failed to optimize query:', error);
    return query; // Return original on error
  }
}

async function logQuery(supabase: any, data: any) {
  try {
    const logData: any = {
      portal: data.portal,
      query: data.query,
      original_query: data.original_query,
      result_count: data.result_count,
      execution_time_ms: data.execution_time_ms,
    };

    // Include optimized_query if it differs from query
    if (data.optimized_query) {
      logData.optimized_query = data.optimized_query;
    }

    // Include payload and response if present
    if (data.search_payload) {
      logData.search_payload = data.search_payload;
    }

    if (data.api_response) {
      logData.api_response = data.api_response;
    }

    // Only include error_message if present
    if (data.error_message) {
      logData.error_message = data.error_message;
    }

    await supabase.from("query_logs").insert(logData);
  } catch (error) {
    console.error("Failed to log query:", error);
  }
}

function detectAcronyms(text: string): Array<{acronym: string; context: string}> {
  const acronymPattern = /\b[A-ZÆØÅ]{2,5}\b/g;
  const matches = text.match(acronymPattern) || [];
  
  const uniqueAcronyms = new Set<string>();
  const results: Array<{acronym: string; context: string}> = [];

  matches.forEach(acronym => {
    if (!uniqueAcronyms.has(acronym)) {
      uniqueAcronyms.add(acronym);
      const index = text.indexOf(acronym);
      const start = Math.max(0, index - 20);
      const end = Math.min(text.length, index + acronym.length + 20);
      const context = text.substring(start, end).trim();

      results.push({ acronym, context });
    }
  });

  return results;
}

async function logAcronymSuggestions(supabase: any, portal: string, query: string, acronyms: Array<{acronym: string; context: string}>) {
  if (!acronyms || acronyms.length === 0) return;

  try {
    const { data: existingAcronyms } = await supabase
      .from("portal_acronyms")
      .select("acronym")
      .eq("portal", portal);

    const knownAcronyms = new Set((existingAcronyms || []).map((a: any) => a.acronym));
    const unknownAcronyms = acronyms.filter(a => !knownAcronyms.has(a.acronym));

    if (unknownAcronyms.length === 0) return;

    const { data: pendingSuggestions } = await supabase
      .from("suggested_acronyms")
      .select("acronym")
      .eq("portal", portal)
      .eq("status", "pending")
      .in("acronym", unknownAcronyms.map(a => a.acronym));

    const alreadySuggested = new Set((pendingSuggestions || []).map((s: any) => s.acronym));

    const newSuggestions = unknownAcronyms
      .filter(a => !alreadySuggested.has(a.acronym))
      .map(a => ({
        portal,
        acronym: a.acronym,
        full_term_suggestion: null,
        example_query: query,
        suggested_by: "openwebui",
      }));

    if (newSuggestions.length > 0) {
      await supabase.from("suggested_acronyms").insert(newSuggestions);
    }
  } catch (error) {
    console.error("Failed to log acronym suggestions:", error);
  }
}

function generateOpenAPISpec() {
  const baseUrl = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") + "/functions/v1/naevneneshus-mcp" || "";
  
  return {
    openapi: "3.0.0",
    info: {
      title: "Nævneneshus MCP Server",
      version: "1.2.0",
      description: "MCP server for Danish administrative appeal boards with intelligent query optimization.",
    },
    servers: [
      {
        url: baseUrl,
        description: "Production server",
      },
    ],
    paths: {
      "/search": {
        post: {
          operationId: "searchPortal",
          summary: "Search publications on a portal",
          description: "Search with automatic query optimization (removes stopwords and category acronyms).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["portal", "query"],
                  properties: {
                    portal: {
                      type: "string",
                      description: "Portal domain",
                      example: "mfkn.naevneneshus.dk",
                    },
                    query: {
                      type: "string",
                      description: "Search query",
                      example: "Bevisbyrde MBL § 72 praksis",
                    },
                    originalQuery: {
                      type: "string",
                      description: "Original query before any optimization",
                      example: "Find afgørelser om bevisbyrde ved MBL § 72",
                    },
                    page: {
                      type: "integer",
                      default: 1,
                    },
                    pageSize: {
                      type: "integer",
                      default: 10,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Search results",
            },
          },
        },
      },
      "/feed": {
        post: {
          operationId: "getPortalFeed",
          summary: "Get latest publications",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["portal"],
                  properties: {
                    portal: { type: "string" },
                    page: { type: "integer", default: 1 },
                    pageSize: { type: "integer", default: 10 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Feed results",
            },
          },
        },
      },
      "/publication": {
        post: {
          operationId: "getPublicationDetail",
          summary: "Get publication details",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["portal", "publicationId"],
                  properties: {
                    portal: { type: "string" },
                    publicationId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Publication details",
            },
          },
        },
      },
      "/portals": {
        get: {
          operationId: "getPortalsList",
          summary: "List available portals",
          responses: {
            "200": {
              description: "List of portals",
            },
          },
        },
      },
      "/health": {
        get: {
          operationId: "healthCheck",
          summary: "Health check",
          responses: {
            "200": {
              description: "Service status",
            },
          },
        },
      },
    },
  };
}