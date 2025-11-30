import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const DEFAULT_PORTALS = [
  'mfkn.naevneneshus.dk',
  'fkn.naevneneshus.dk',
  'ekn.naevneneshus.dk',
  'pkn.naevneneshus.dk',
  'aen.naevneneshus.dk',
  'pn.naevneneshus.dk',
  'dkbb.naevneneshus.dk',
  'dnfe.naevneneshus.dk',
  'klfu.naevneneshus.dk',
  'tele.naevneneshus.dk',
  'rn.naevneneshus.dk',
  'apv.naevneneshus.dk',
  'tvist.naevneneshus.dk',
  'ean.naevneneshus.dk',
  'byf.naevneneshus.dk',
];

interface PortalData {
  portal: string;
  siteSettings?: any;
  legalAreas?: string[];
  feedSample?: any;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'collect';

    if (action === 'collect') {
      return await collectAllPortalData(supabase);
    } else if (action === 'analyze') {
      return await analyzePortalData(supabase);
    } else if (action === 'refresh') {
      return await refreshPortalData(supabase);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use ?action=collect, ?action=analyze or ?action=refresh' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function collectAllPortalData(supabase: any) {
  const results = await performPortalCollection(supabase);

  return new Response(
    JSON.stringify({
      message: 'Data collection completed',
      results,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function performPortalCollection(supabase: any) {
  const results: PortalData[] = [];

  for (const portal of DEFAULT_PORTALS) {
    console.log(`Collecting data for ${portal}...`);
    const portalData = await collectPortalData(portal);
    results.push(portalData);

    if (!portalData.error) {
      await storePortalData(supabase, portalData);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

async function collectPortalData(portal: string): Promise<PortalData> {
  const data: PortalData = { portal };

  try {
    const siteSettingsResponse = await fetch(`https://${portal}/api/SiteSettings`);
    if (siteSettingsResponse.ok) {
      data.siteSettings = await siteSettingsResponse.json();
    }
  } catch (error) {
    console.error(`Error fetching SiteSettings for ${portal}:`, error);
  }

  try {
    const legalAreasResponse = await fetch(`https://${portal}/lovomraader`);
    if (legalAreasResponse.ok) {
      const html = await legalAreasResponse.text();
      data.legalAreas = parseLegalAreas(html);
    }
  } catch (error) {
    console.error(`Error fetching legal areas for ${portal}:`, error);
  }

  try {
    const feedResponse = await fetch(`https://${portal}/api/Feed`);
    if (feedResponse.ok) {
      data.feedSample = await feedResponse.json();
    }
  } catch (error) {
    console.error(`Error fetching feed for ${portal}:`, error);
  }

  if (!data.siteSettings && !data.legalAreas && !data.feedSample) {
    data.error = 'No data collected';
  }

  return data;
}

function parseLegalAreas(html: string): string[] {
  const areas: string[] = [];

  const linkRegex = /<a[^>]*href="\/lovomraader\/[^"]*"[^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const text = match[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();

    if (text && text.length > 2 && !text.includes('class=') && !text.includes('href=')) {
      areas.push(text);
    }
  }

  return [...new Set(areas)];
}

async function storePortalData(supabase: any, portalData: PortalData) {
  const { portal, siteSettings, legalAreas } = portalData;

  const portalName = siteSettings?.title || portal;
  const description = siteSettings?.description || '';

  await supabase.from('portal_metadata').upsert({
    portal,
    name: portalName,
    description,
    domain_focus: '',
    updated_at: new Date().toISOString(),
  });

  if (siteSettings?.categories) {
    for (const category of siteSettings.categories) {
      await supabase.from('site_categories').upsert({
        portal,
        category_id: category.id,
        category_title: category.title,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (legalAreas && legalAreas.length > 0) {
    for (const area of legalAreas) {
      const slug = area.toLowerCase()
        .replace(/[æå]/g, 'a')
        .replace(/ø/g, 'o')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      await supabase.from('legal_areas').upsert(
        {
          portal,
          area_name: area,
          area_slug: slug,
          keywords: [],
        },
        { onConflict: 'portal,area_name' }
      );
    }
  }

  console.log(`Stored data for ${portal}`);
}

async function analyzePortalData(supabase: any) {
  const analysis = await performPortalAnalysis(supabase);

  if ('error' in analysis) {
    return new Response(
      JSON.stringify({ error: analysis.error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      message: 'Analysis completed',
      results: analysis.results,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function performPortalAnalysis(supabase: any): Promise<{ results: any[] } | { error: string }> {
  console.log('Starting analysis of portal data...');

  const { data: portals } = await supabase
    .from('portal_metadata')
    .select('portal');

  if (!portals || portals.length === 0) {
    return { error: 'No portal data found. Run ?action=collect first.' };
  }

  const analysisResults = [] as any[];

  for (const { portal } of portals) {
    console.log(`Analyzing ${portal}...`);

    const { data: legalAreas } = await supabase
      .from('legal_areas')
      .select('*')
      .eq('portal', portal);

    const { data: categories } = await supabase
      .from('site_categories')
      .select('*')
      .eq('portal', portal);

    const acronyms = extractAcronyms(legalAreas, categories);
    const synonyms = generateSynonyms(legalAreas, categories);
    const keywords = extractKeywords(legalAreas, categories);

    for (const acronym of acronyms) {
      await supabase.from('portal_acronyms').upsert({
        portal,
        acronym: acronym.acronym,
        full_term: acronym.full_term,
        context: acronym.context,
      });
    }

    for (const synonym of synonyms) {
      await supabase.from('portal_synonyms').upsert({
        portal,
        term: synonym.term,
        synonyms: synonym.synonyms,
        category: synonym.category,
      });
    }

    for (const area of legalAreas || []) {
      const areaKeywords = keywords.filter(k =>
        k.source === area.area_name || k.source === area.id
      );

      if (areaKeywords.length > 0) {
        await supabase.from('legal_areas')
          .update({ keywords: areaKeywords.map(k => k.keyword) })
          .eq('id', area.id);
      }
    }

    analysisResults.push({
      portal,
      acronyms: acronyms.length,
      synonyms: synonyms.length,
      keywords: keywords.length,
    });
  }

  return { results: analysisResults };
}

async function refreshPortalData(supabase: any) {
  const collectionResults = await performPortalCollection(supabase);
  const analysis = await performPortalAnalysis(supabase);

  if ('error' in analysis) {
    return new Response(
      JSON.stringify({
        error: analysis.error,
        collection: { portalsProcessed: collectionResults.length, results: collectionResults },
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      message: 'Collection and analysis completed',
      collection: {
        portalsProcessed: collectionResults.length,
        results: collectionResults,
      },
      analysis: {
        portalsAnalyzed: analysis.results.length,
        results: analysis.results,
      },
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function extractAcronyms(legalAreas: any[], categories: any[]): any[] {
  const acronyms: any[] = [];
  const acronymMap = new Map<string, string>();

  const allTexts = [
    ...(legalAreas || []).map(a => a.area_name),
    ...(categories || []).map(c => c.category_title),
  ];

  for (const text of allTexts) {
    const matches = text.match(/\b[A-ZÆØÅ]{2,}\b/g);
    if (matches) {
      for (const match of matches) {
        if (!acronymMap.has(match)) {
          acronymMap.set(match, text);
        }
      }
    }

    const paragraphMatch = text.match(/§\s*\d+/g);
    if (paragraphMatch) {
      for (const para of paragraphMatch) {
        acronyms.push({
          acronym: para,
          full_term: text,
          context: 'paragraph_reference',
        });
      }
    }
  }

  for (const [acronym, context] of acronymMap.entries()) {
    acronyms.push({
      acronym,
      full_term: context,
      context: 'legal_area',
    });
  }

  return acronyms;
}

function generateSynonyms(legalAreas: any[], categories: any[]): any[] {
  const synonyms: any[] = [];
  const synonymMap: Map<string, Set<string>> = new Map();

  const allTexts = [
    ...(legalAreas || []).map(a => a.area_name),
    ...(categories || []).map(c => c.category_title),
  ];

  for (const text of allTexts) {
    const normalized = text.toLowerCase();

    const words = normalized.split(/\s+/);
    for (const word of words) {
      if (word.length > 4) {
        const stem = word.replace(/en$|et$|ne$|er$|ing$|else$/, '');
        if (stem.length > 3) {
          if (!synonymMap.has(stem)) {
            synonymMap.set(stem, new Set());
          }
          synonymMap.get(stem)!.add(word);
        }
      }
    }

    if (normalized.includes('forurening')) {
      const term = 'forurening';
      if (!synonymMap.has(term)) {
        synonymMap.set(term, new Set());
      }
      synonymMap.get(term)!.add('forurenet');
      synonymMap.get(term)!.add('forurene');
      synonymMap.get(term)!.add('forureningslov');
    }

    if (normalized.includes('klage') || normalized.includes('reklamation')) {
      const term = 'klage';
      if (!synonymMap.has(term)) {
        synonymMap.set(term, new Set());
      }
      synonymMap.get(term)!.add('reklamation');
      synonymMap.get(term)!.add('klagen');
      synonymMap.get(term)!.add('klager');
    }
  }

  for (const [term, syns] of synonymMap.entries()) {
    if (syns.size > 1) {
      synonyms.push({
        term,
        synonyms: Array.from(syns),
        category: null,
      });
    }
  }

  return synonyms;
}

function extractKeywords(legalAreas: any[], categories: any[]): any[] {
  const keywords: any[] = [];

  for (const area of legalAreas || []) {
    const words = area.area_name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 4 && !['inden', 'efter', 'under'].includes(word)) {
        keywords.push({
          keyword: word,
          source: area.area_name,
          type: 'legal_area',
        });
      }
    }
  }

  for (const category of categories || []) {
    const words = category.category_title.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 4) {
        keywords.push({
          keyword: word,
          source: category.category_title,
          type: 'category',
        });
      }
    }
  }

  return keywords;
}
