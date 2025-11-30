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
    const searchUrl = buildSearchUrl(portal, query, page, pageSize, filters);

    const response = await fetch(searchUrl, {
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
    const executionTime = Date.now() - startTime;

    await logQuery(supabase, {
      portal,
      query,
      original_query: originalQuery || query,
      result_count: results.totalCount,
      execution_time_ms: executionTime,
      status: "success",
      detected_acronyms: detectedAcronyms,
    });

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
      status: "error",
      error_message: error.message,
    });

    throw error;
  }
}

async function getPortalFeed(request: FeedRequest) {
  const { portal, page = 1, pageSize = 10 } = request;

  const feedUrl = `https://${portal}/api/publications?sort=date&order=desc&page=${page}&pageSize=${pageSize}`;

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

  const detailUrl = `https://${portal}/api/publications/${publicationId}`;

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

  const cleanBody = data.body ? stripHtml(data.body) : "";

  return {
    success: true,
    portal,
    publicationId,
    title: data.title,
    body: cleanBody,
    abstract: data.abstract,
    metadata: {
      category: data.category,
      date: data.publicationDate,
      journalNumber: data.journalNumber,
    },
    link: `https://${portal}/publications/${publicationId}`,
  };
}

async function getPortalsList() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await supabase
    .from("portal_metadata")
    .select("portal, name, domain_focus")
    .order("portal");

  if (error) throw error;

  return {
    success: true,
    portals: data || [],
  };
}

function buildSearchUrl(
  portal: string,
  query: string,
  page: number,
  pageSize: number,
  filters?: SearchRequest["filters"]
): string {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  if (filters?.category) {
    params.set("category", filters.category);
  }

  if (filters?.dateRange?.start) {
    params.set("dateFrom", filters.dateRange.start);
  }

  if (filters?.dateRange?.end) {
    params.set("dateTo", filters.dateRange.end);
  }

  return `https://${portal}/api/search?${params.toString()}`;
}

function parseSearchResults(data: any, portal: string) {
  const items = data.results || data.items || data.publications || [];
  const totalCount = data.totalCount || data.total || items.length;

  const parsedItems = items.map((item: any) => ({
    id: item.id || item.publicationId,
    title: item.title,
    abstract: item.abstract || item.summary || "",
    category: item.category || "ikke oplyst",
    date: item.publicationDate || item.date || "ikke oplyst",
    journalNumber: item.journalNumber || item.caseNumber || "ikke oplyst",
    link: item.link || `https://${portal}/publications/${item.id || item.publicationId}`,
  }));

  return {
    items: parsedItems,
    totalCount,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

async function logQuery(supabase: any, data: any) {
  try {
    await supabase.from("query_logs").insert({
      portal: data.portal,
      query: data.query,
      original_query: data.original_query,
      result_count: data.result_count,
      execution_time_ms: data.execution_time_ms,
      status: data.status,
      error_message: data.error_message,
      detected_acronyms: data.detected_acronyms,
    });
  } catch (error) {
    console.error("Failed to log query:", error);
  }
}

function generateOpenAPISpec() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const baseUrl = `${supabaseUrl}/functions/v1/naevneneshus-mcp`;

  return {
    openapi: "3.0.0",
    info: {
      title: "Nævneneshus MCP Server",
      version: "1.1.0",
      description: "MCP server for Danish administrative appeal boards. Provides search, feed, and publication detail endpoints for all *.naevneneshus.dk portals with automatic query logging.",
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
          description: "Search for publications on any naevneneshus.dk portal. Automatically logs all queries to database.",
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
                      description: "Portal domain (e.g., mfkn.naevneneshus.dk)",
                      example: "mfkn.naevneneshus.dk",
                    },
                    query: {
                      type: "string",
                      description: "Optimized search query (filler words removed)",
                      example: "jordforurening",
                    },
                    originalQuery: {
                      type: "string",
                      description: "User's original query before optimization",
                      example: "Find afgørelser om jordforurening",
                    },
                    page: {
                      type: "integer",
                      default: 1,
                      description: "Page number (1-indexed)",
                    },
                    pageSize: {
                      type: "integer",
                      default: 10,
                      description: "Number of results per page",
                    },
                    filters: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          description: "Filter by category",
                        },
                        dateRange: {
                          type: "object",
                          properties: {
                            start: {
                              type: "string",
                              format: "date",
                            },
                            end: {
                              type: "string",
                              format: "date",
                            },
                          },
                        },
                      },
                    },
                    detectedAcronyms: {
                      type: "array",
                      description: "Acronyms detected in query for suggestion system",
                      items: {
                        type: "object",
                        properties: {
                          acronym: { type: "string" },
                          context: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Search results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      portal: { type: "string" },
                      query: { type: "string" },
                      originalQuery: { type: "string" },
                      results: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            abstract: { type: "string" },
                            category: { type: "string" },
                            date: { type: "string" },
                            journalNumber: { type: "string" },
                            link: { type: "string" },
                          },
                        },
                      },
                      totalCount: { type: "integer" },
                      page: { type: "integer" },
                      pageSize: { type: "integer" },
                      executionTime: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/feed": {
        post: {
          operationId: "getPortalFeed",
          summary: "Get latest publications",
          description: "Get the latest publications from a portal",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["portal"],
                  properties: {
                    portal: {
                      type: "string",
                      description: "Portal domain",
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
              description: "Feed results",
            },
          },
        },
      },
      "/publication": {
        post: {
          operationId: "getPublicationDetail",
          summary: "Get publication details",
          description: "Get full details of a specific publication including body text",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["portal", "publicationId"],
                  properties: {
                    portal: {
                      type: "string",
                      description: "Portal domain",
                    },
                    publicationId: {
                      type: "string",
                      description: "Publication ID from search results",
                    },
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
          description: "Get list of all available naevneneshus.dk portals",
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
          description: "Check if the MCP server is running",
          responses: {
            "200": {
              description: "Server is healthy",
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Supabase Anon Key",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  };
}
