import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseCategoryFromQuery } from "./categoryParser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Api-Key",
};

const categoryCache: Record<string, PortalCategory[]> = {};

interface SearchRequest {
  portal: string;
  query: string;
  detectedAcronym?: string | null;
  originalQuery?: string;
  originalRequest?: string;
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

interface PortalCategory {
  category_id: string;
  category_title: string;
  aliases: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);

  const supabase = createSupabaseClient();
  const baseLogContext = {
    endpoint: url.pathname,
    method: req.method,
    headers: req.headers,
  };

  if (url.pathname.endsWith('/openapi.json')) {
    const spec = getOpenAPISpec();

    await logConnection(supabase, {
      ...baseLogContext,
      success: true,
      tools_discovered: countOpenApiOperations(spec),
    });

    return new Response(JSON.stringify(spec, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  try {
    let operation: string;
    let params: any;

    if (req.method === "GET") {
      operation = url.searchParams.get('operation') || 'listPortals';
      
      params = {};
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'operation') {
          params[key] = value;
        }
      }
      
      console.log('GET request - Operation:', operation, 'Params:', params);
    } else {
      const bodyText = await req.text();
      console.log('POST - Raw body:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      
      const parsed = JSON.parse(bodyText);

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

    await logConnection(supabase, {
      ...baseLogContext,
      success: true,
      tools_discovered:
        operation === "listPortals"
          ? Array.isArray((result as any)?.portals)
            ? (result as any).portals.length
            : 0
          : countOpenApiOperations(getOpenAPISpec()),
    });

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    await logConnection(supabase, {
      ...baseLogContext,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

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

  const pagination = (request as any).pagination || {};
  const portal = request.portal || 'mfkn.naevneneshus.dk';
  const query = request.query;
  let aiDetectedAcronym = request.detectedAcronym;
  const originalQuery =
    request.originalRequest ||
    request.originalQuery ||
    (request as any).original_request ||
    query;
  const page = pagination.page || request.page || 1;
  const pageSize = pagination.pageSize || request.pageSize || 10;
  const filters = request.filters;
  let detectedAcronyms = request.detectedAcronyms;

  if ((!detectedAcronyms || detectedAcronyms.length === 0) && aiDetectedAcronym) {
    detectedAcronyms = [{
      acronym: aiDetectedAcronym,
      full_term: '',
      source: 'ai'
    }];
  }

  // FALLBACK: If detectedAcronym is not provided but detected_acronyms array exists, use first acronym
  if (!aiDetectedAcronym && detectedAcronyms && detectedAcronyms.length > 0) {
    aiDetectedAcronym = detectedAcronyms[0].acronym;
    console.log(`Using acronym from detected_acronyms array: ${aiDetectedAcronym}`);
  }

  if (!query) {
    throw new Error('Missing required parameter: query');
  }

  const supabase = createSupabaseClient();

  try {
    const today = new Date().toISOString().slice(0, 10);
    const filtersWithDefaults = {
      ...filters,
      dateRange: {
        start: filters?.dateRange?.start || '2022-01-01',
        end: filters?.dateRange?.end || today,
      },
    };

    const categories = await getPortalCategories(supabase, portal);

    const explicitCategoryParse = parseCategoryFromQuery(query, categories);
    let finalQueryForSearch = query;
    let detectedCategory = null;

    if (explicitCategoryParse) {
      detectedCategory = {
        id: explicitCategoryParse.categoryId,
        title: explicitCategoryParse.categoryTitle,
        source: 'explicit_syntax',
        matched_value: explicitCategoryParse.matchedValue,
      };
      finalQueryForSearch = explicitCategoryParse.cleanedQuery;
      console.log(`Parsed explicit category: "${explicitCategoryParse.matchedValue}" → ${explicitCategoryParse.categoryTitle}`);
      console.log(`Cleaned query: "${finalQueryForSearch}"`);
    }

    let categoryInfo = null;
    let aiMissedAcronym = false;

    if (!detectedCategory && aiDetectedAcronym) {
      console.log(`Attempting to match acronym: ${aiDetectedAcronym}`);
      console.log(`Available categories: ${categories.length}`);

      categoryInfo = await matchAcronymToCategory(categories, aiDetectedAcronym);

      if (!categoryInfo) {
        console.warn(`Failed to match acronym "${aiDetectedAcronym}" to any category`);
        console.log(`Available category aliases:`, categories.map(c => ({ title: c.category_title, aliases: c.aliases })));
        await logUnknownAcronym(supabase, portal, aiDetectedAcronym, finalQueryForSearch);
      } else {
        console.log(`Successfully matched "${aiDetectedAcronym}" to category: ${categoryInfo.title}`);
        detectedCategory = {
          id: categoryInfo.id,
          title: categoryInfo.title,
          source: 'ai_acronym',
          matched_value: aiDetectedAcronym,
        };
      }
    }

    if (!detectedCategory) {
      categoryInfo = await detectCategoryFromQuery(categories, finalQueryForSearch);
      if (categoryInfo && !aiDetectedAcronym) {
        aiMissedAcronym = true;
        detectedCategory = {
          id: categoryInfo.id,
          title: categoryInfo.title,
          source: 'server_detected',
          matched_value: 'auto-detected',
        };
      }
    }

    const resolvedFilterCategory = await resolveCategoryFromFilter(categories, filtersWithDefaults.category);
    if (resolvedFilterCategory && !detectedCategory) {
      detectedCategory = {
        id: resolvedFilterCategory.id,
        title: resolvedFilterCategory.title,
        source: 'filter_parameter',
        matched_value: filtersWithDefaults.category,
      };
    }

    const chosenCategory = detectedCategory;

    const mergedFilters = {
      ...filtersWithDefaults,
      category: chosenCategory?.id || filtersWithDefaults.category,
      categoryTitle: chosenCategory?.title || filtersWithDefaults.categoryTitle,
    };

    const requestLogMetadata: Record<string, unknown> = {
      portal,
      query,
      original_query: originalQuery || query,
      filters: mergedFilters,
      pagination: { page, pageSize },
      detected_acronyms: detectedAcronyms,
      ai_detected_acronym: aiDetectedAcronym,
      ai_missed_acronym: aiMissedAcronym,
      detected_category: detectedCategory,
    };

    let finalQuery = finalQueryForSearch;
    if (categoryInfo && !aiDetectedAcronym && !explicitCategoryParse) {
      finalQuery = await optimizeQuery(categories, finalQueryForSearch);
    }

    const searchPayload = buildSearchPayload(finalQuery, page, pageSize, mergedFilters);
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
    const results = parseSearchResults(data, portal, finalQuery);
    const executionTime = Date.now() - startTime;

    let acronymsToLog = detectedAcronyms;
    if (!acronymsToLog || acronymsToLog.length === 0) {
      acronymsToLog = detectAcronyms(originalQuery || query);
      requestLogMetadata.detected_acronyms = acronymsToLog;
    }

    const responsePayload = {
      success: true,
      portal,
      query: finalQuery,
      originalQuery: originalQuery || query,
      results: results.results,
      totalCount: results.totalCount,
      page,
      pageSize,
      executionTime,
    };

    await logQuery(supabase, {
      portal,
      query,
      filters: mergedFilters,
      original_query: originalQuery || query,
      optimized_query: finalQuery !== query ? finalQuery : null,
      result_count: results.totalCount,
      execution_time_ms: executionTime,
      search_payload: searchPayload,
      api_response: data,
      raw_request: requestLogMetadata,
      tool_response: responsePayload,
      ai_detected_acronym: aiDetectedAcronym,
      matched_category_id: chosenCategory?.id,
      matched_category_title: chosenCategory?.title,
      ai_missed_acronym: aiMissedAcronym,
    });

    if (acronymsToLog && acronymsToLog.length > 0) {
      await logAcronyms(supabase, portal, acronymsToLog);
    }

    return responsePayload;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    await logQuery(supabase, {
      portal,
      query,
      original_query: originalQuery || query,
      result_count: 0,
      execution_time_ms: executionTime,
      error_message: error instanceof Error ? error.message : "Unknown error",
      raw_request: {
        portal,
        query,
        original_query: originalQuery || query,
        filters,
        pagination: { page, pageSize },
        detected_acronyms: detectedAcronyms,
      },
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

  const detectedType =
    (data.Type || data.type || data.publicationType || data.PublicationType || "")
      .toString()
      .toLowerCase();
  const type = detectedType === "news" ? "news" : "ruling";
  const fallbackPath = type === "news" ? `nyhed/${id}` : `afgoerelse/${id}`;

  return {
    success: true,
    portal,
    id,
    title: data.Title,
    body: cleanHtml(data.Body),
    publicationDate: data.PublicationDate,
    caseNumber: data.CaseNumber,
    categories: data.Categories || [],
    type,
    url: buildPortalUrl(
      portal,
      data.Url || data.url || data.PublicationUrl || data.publicationUrl || fallbackPath
    ),
  };
}

async function listPortals() {
  const supabase = createSupabaseClient();

  const { data: portals, error } = await supabase
    .from('portal_metadata')
    .select('portal, name, domain_focus')
    .order('portal');

  if (error || !portals) {
    console.error('Failed to load portal metadata:', error);
    return {
      success: true,
      portals: [],
    };
  }

  const withCategories = await Promise.all(
    portals.map(async (portal) => {
      const categories = await getPortalCategories(supabase, portal.portal);

      return {
        domain: portal.portal,
        name: portal.name,
        description: portal.domain_focus || '',
        categories: categories.map(c => c.category_title),
      };
    })
  );

  return {
    success: true,
    portals: withCategories,
  };
}

async function getPortalCategories(supabase: any, portal: string): Promise<PortalCategory[]> {
  if (categoryCache[portal]) {
    return categoryCache[portal];
  }

  try {
    const response = await fetch(`https://${portal}/api/SiteSettings`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "MCP-Server/1.0",
      },
    });

    if (response.ok) {
      const settings = await response.json();
      const topics = settings?.topics || settings?.Topics || [];

      const categoriesFromSettings: PortalCategory[] = (topics || [])
        .map((item: any) => ({
          category_id: item.id || item.Id || item.topicId,
          category_title: item.title || item.Title || item.name || item.Name,
          aliases: generateAliases(item.title || item.Title || item.name || item.Name || ""),
        }))
        .filter((item: PortalCategory) => Boolean(item.category_id && item.category_title));

      if (categoriesFromSettings.length > 0) {
        categoryCache[portal] = categoriesFromSettings;

        try {
          await Promise.all(
            categoriesFromSettings.map((category) =>
              supabase.from('site_categories').upsert(
                {
                  portal,
                  category_id: category.category_id,
                  category_title: category.category_title,
                  aliases: category.aliases,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'portal,category_id' }
              )
            )
          );
        } catch (error) {
          console.error('Failed to upsert categories from SiteSettings:', error);
        }

        return categoriesFromSettings;
      }
    } else {
      console.warn(`SiteSettings returned status ${response.status} for ${portal}`);
    }
  } catch (error) {
    console.error(`Failed to fetch SiteSettings for ${portal}:`, error);
  }

  try {
    const { data: categories } = await supabase
      .from('site_categories')
      .select('category_id, category_title, aliases')
      .eq('portal', portal);

    categoryCache[portal] = categories || [];
    return categories || [];
  } catch (error) {
    console.error('Failed to load categories from Supabase:', error);
    return [];
  }
}

function generateAliases(title: string): string[] {
  if (!title) return [];

  const aliases: string[] = [title];

  const abbreviationMap: Record<string, string[]> = {
    'Miljøbeskyttelsesloven': ['MBL', 'Miljøbeskyttelse'],
    'Naturbeskyttelsesloven': ['NBL', 'Naturbeskyttelse'],
    'Planloven': ['PL'],
    'Husdyrloven': ['HDL'],
    'Råstofloven': ['RL'],
    'Jordforureningsloven': ['JFL'],
    'Vandløbsloven': ['VL'],
    'Skovloven': ['SL'],
  };

  for (const [fullName, abbrevs] of Object.entries(abbreviationMap)) {
    if (title.includes(fullName)) {
      aliases.push(...abbrevs);
    }
  }

  const words = title.split(/\s+/);
  if (words.length > 1) {
    const acronym = words
      .map(w => w[0])
      .join('')
      .toUpperCase();
    if (acronym.length >= 2 && acronym.length <= 5) {
      aliases.push(acronym);
    }
  }

  return [...new Set(aliases)];
}

function buildSearchPayload(query: string, page: number, pageSize: number, filters?: any) {
  const normalizedFilters: any = {};

  if (filters?.dateRange?.start || filters?.dateRange?.end) {
    normalizedFilters.dateRange = {
      start: filters?.dateRange?.start,
      end: filters?.dateRange?.end,
    };
  }

  if (filters?.category) {
    normalizedFilters.category = filters.category;
  }

  if (filters?.categoryTitle) {
    normalizedFilters.categoryTitle = filters.categoryTitle;
  }

  return {
    query,
    ...(Object.keys(normalizedFilters).length > 0 ? { filters: normalizedFilters } : {}),
    pagination: {
      page,
      pageSize,
    },
  };
}

function parseSearchResults(data: any, portal: string, query?: string) {
  const items = data.publications || data.Items || [];
  const totalCount = data.totalCount || data.TotalCount || 0;

  const results = items.map((item: any) => {
    const id = item.id || item.Id;
    const detectedType =
      (item.type || item.Type || item.publicationType || item.PublicationType || "")
        .toString()
        .toLowerCase();
    const type = detectedType === "news" ? "news" : "ruling";

    const fallbackPath = type === "news" ? `nyhed/${id}` : `afgoerelse/${id}`;

    let url: string;
    if (type === "ruling" && query) {
      const encodedQuery = encodeURIComponent(query);
      url = `https://${portal}/afgoerelse/${id}?highlight=${encodedQuery}`;
    } else if (type === "news") {
      url = `https://${portal}/nyhed/${id}`;
    } else {
      url = buildPortalUrl(
        portal,
        item.url ||
          item.Url ||
          item.publicationUrl ||
          item.PublicationUrl ||
          fallbackPath
      );
    }

    const rawBody = item.body || item.Body || item.abstract || item.Abstract || "";
    const MAX_BODY_LENGTH = 1000;
    const cleanBodyFull = cleanHtml(rawBody);
    const cleanBody = cleanBodyFull.length > MAX_BODY_LENGTH
      ? cleanBodyFull.substring(0, MAX_BODY_LENGTH) + '...'
      : cleanBodyFull;

    return {
      id,
      type,
      title: item.title || item.Title,
      abstract: cleanHtml(item.abstract || item.Abstract || ""),
      cleanBody,
      highlights: (item.highlights || []).map((h: string) => cleanHtml(h)),
      publicationDate: item.published_date || item.publicationDate || item.PublicationDate,
      caseNumber: item.jnr?.[0] || item.caseNumber || item.CaseNumber,
      categories: item.categories || item.Categories || [],
      url,
    };
  });

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

async function resolveCategoryFromFilter(categories: PortalCategory[], categoryValue?: string): Promise<{ id: string; title: string } | null> {
  if (!categoryValue || typeof categoryValue !== 'string') return null;

  try {
    const normalizedFilter = categoryValue.toLowerCase();

    for (const category of categories) {
      if (category.category_id.toLowerCase() === normalizedFilter || category.category_title.toLowerCase() === normalizedFilter) {
        return { id: category.category_id, title: category.category_title };
      }

      const aliases = category.aliases || [];
      const aliasMatch = aliases.some((alias: string) => alias.toLowerCase() === normalizedFilter);

      if (aliasMatch) {
        return { id: category.category_id, title: category.category_title };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to resolve filter category:', error);
    return null;
  }
}

async function detectCategoryFromQuery(categories: PortalCategory[], query: string): Promise<{ id: string; title: string } | null> {
  try {
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

async function optimizeQuery(categories: PortalCategory[], query: string): Promise<string> {
  try {
    const stopwords = [
      'praksis', 'afgørelse', 'afgørelser', 'kendelse', 'kendelser',
      'dom', 'domme', 'sag', 'sager', 'om', 'ved', 'for', 'til',
      'søgning', 'søg', 'find', 'finde', 'vise', 'vis', 'alle',
      'og', 'eller', 'samt', 'i', 'af', 'på', 'med', 'fra'
    ];

    const categoryTerms = new Set<string>();
    categories.forEach((cat: any) => {
      (cat.aliases || []).forEach((alias: string) => {
        categoryTerms.add(alias.toLowerCase());
        categoryTerms.add(alias.toUpperCase());
      });
    });

    let optimized = query;
    for (const term of categoryTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      optimized = optimized.replace(regex, '');
    }

    const seenParagraphs = new Set<string>();
    const paragraphPattern = /§\s*\d+(?:-[^\s]+)?/g;

    optimized = optimized.replace(paragraphPattern, (match) => {
      const baseNum = match.match(/§\s*\d+/)?.[0].replace(/\s+/g, ' ');
      if (!baseNum) return match;

      if (seenParagraphs.has(baseNum)) {
        return '';
      }

      seenParagraphs.add(baseNum);

      const parts = match.split('-');
      if (parts.length > 1) {
        const suffix = parts[1].replace(/[.,!?;:]$/, '').toLowerCase();
        if (stopwords.includes(suffix)) {
          return baseNum;
        }
      }

      return match;
    });

    let words = optimized.split(/\s+/).filter(w => w.length > 0);

    words = words.filter(word => {
      const cleanWord = word.replace(/[.,!?;:\-]$/, '').toLowerCase();
      const baseWord = cleanWord.split('-')[0];

      const parts = word.split('-');
      const hasStopwordPart = parts.some(part => {
        const cleanPart = part.replace(/[.,!?;:]$/, '').toLowerCase();
        return stopwords.includes(cleanPart);
      });

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
      filters: data.filters ?? {},
      result_count: data.result_count,
      execution_time_ms: data.execution_time_ms,
    };

    if (data.original_query) logData.original_query = data.original_query;
    if (data.optimized_query) logData.optimized_query = data.optimized_query;
    if (data.error_message) logData.error_message = data.error_message;
    if (data.search_payload) logData.search_payload = data.search_payload;
    if (data.api_response) logData.api_response = data.api_response;
    if (data.raw_request) logData.raw_request = data.raw_request;
    if (data.tool_response) logData.tool_response = data.tool_response;
    if (data.user_identifier) logData.user_identifier = data.user_identifier;

    const { error } = await supabase.from("query_logs").insert(logData);

    if (error) {
      console.error("Failed to log query with full payload:", error);

      const fallbackLog = {
        portal: data.portal,
        query: data.query,
        filters: data.filters ?? {},
        result_count: data.result_count ?? 0,
        execution_time_ms: data.execution_time_ms ?? 0,
        error_message: data.error_message || null,
        user_identifier: data.user_identifier,
      };

      const { error: fallbackError } = await supabase.from("query_logs").insert(fallbackLog);

      if (fallbackError) {
        console.error("Fallback query log insert failed:", fallbackError);
      }
    }
  } catch (error) {
    console.error("Failed to log query:", error);
  }
}

function createSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY") ||
      ""
  );
}

function buildPortalUrl(portal: string, path?: string) {
  if (!path) return `https://${portal}`;

  if (path.startsWith("http")) {
    return path;
  }

  const trimmedPath = path.replace(/^\//, "");
  return `https://${portal}/${trimmedPath}`;
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

async function matchAcronymToCategory(
  categories: PortalCategory[],
  acronym: string
): Promise<{ id: string; title: string } | null> {
  if (!acronym) return null;

  const normalizedAcronym = acronym.toUpperCase().trim();

  for (const category of categories) {
    const aliases = category.aliases || [];
    const match = aliases.find(
      alias => alias.toUpperCase() === normalizedAcronym
    );

    if (match) {
      return {
        id: category.category_id,
        title: category.category_title
      };
    }
  }

  return null;
}

async function logUnknownAcronym(
  supabase: any,
  portal: string,
  acronym: string,
  context: string
) {
  try {
    const { data: existing } = await supabase
      .from('unknown_acronyms')
      .select('frequency')
      .eq('portal', portal)
      .eq('acronym', acronym.toUpperCase())
      .single();

    if (existing) {
      await supabase
        .from('unknown_acronyms')
        .update({
          frequency: existing.frequency + 1,
          last_seen: new Date().toISOString(),
          context_query: context
        })
        .eq('portal', portal)
        .eq('acronym', acronym.toUpperCase());
    } else {
      await supabase
        .from('unknown_acronyms')
        .insert({
          portal,
          acronym: acronym.toUpperCase(),
          context_query: context,
          frequency: 1
        });
    }
  } catch (error) {
    console.error('Failed to log unknown acronym:', error);
  }
}

async function logConnection(
  supabase: any,
  log: {
    endpoint: string;
    method: string;
    headers: Headers;
    success: boolean;
    tools_discovered?: number;
    error_message?: string;
  }
) {
  try {
    const userAgent = log.headers.get("user-agent") || log.headers.get("User-Agent") || "unknown";
    const authHeader = log.headers.get("authorization") || log.headers.get("Authorization") || "";
    const authType = authHeader ? authHeader.split(" ")[0] : "none";
    const ipAddress =
      log.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      log.headers.get("x-real-ip") ||
      "unknown";

    const requestHeaders = {
      "x-client-info": log.headers.get("x-client-info") || null,
      "content-type": log.headers.get("content-type") || null,
      "user-agent": userAgent,
    };

    await supabase.from("connection_logs").insert({
      endpoint: log.endpoint,
      method: log.method,
      user_agent: userAgent,
      auth_type: authType,
      ip_address: ipAddress,
      request_headers: requestHeaders,
      tools_discovered: log.tools_discovered ?? 0,
      success: log.success,
      error_message: log.error_message || null,
    });
  } catch (error) {
    console.error("Failed to log connection:", error);
  }
}

function countOpenApiOperations(spec: any): number {
  try {
    const paths = spec?.paths || {};
    return Object.values(paths).reduce((total, pathItem: any) => {
      if (!pathItem || typeof pathItem !== "object") return total;
      return total + Object.keys(pathItem).length;
    }, 0);
  } catch (error) {
    console.error("Failed to count OpenAPI operations:", error);
    return 0;
  }
}
