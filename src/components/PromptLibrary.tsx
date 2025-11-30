import { useState, useEffect } from 'react';
import { Copy, Check, Download, FileText, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Portal {
  portal: string;
  name: string;
  domain_focus: string;
}

interface Category {
  category_id: string;
  category_title: string;
  aliases: string[];
}

interface LegalArea {
  area_name: string;
}

interface Acronym {
  acronym: string;
  full_term: string;
}

export function PromptLibrary() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [selectedPortal, setSelectedPortal] = useState<string>('mfkn.naevneneshus.dk');
  const [categories, setCategories] = useState<Category[]>([]);
  const [legalAreas, setLegalAreas] = useState<LegalArea[]>([]);
  const [acronyms, setAcronyms] = useState<Acronym[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'guide' | 'examples'>('system');

  useEffect(() => {
    loadPortals();
  }, []);

  useEffect(() => {
    if (selectedPortal) {
      loadPortalData(selectedPortal);
    }
  }, [selectedPortal]);

  async function loadPortals() {
    const { data } = await supabase
      .from('portal_metadata')
      .select('portal, name, domain_focus')
      .order('portal');

    if (data) {
      setPortals(data);
    }
    setLoading(false);
  }

  async function loadPortalData(portal: string) {
    setLoading(true);

    const [categoriesRes, legalAreasRes, acronymsRes] = await Promise.all([
      supabase
        .from('site_categories')
        .select('category_id, category_title, aliases')
        .eq('portal', portal)
        .order('category_title'),
      supabase
        .from('legal_areas')
        .select('area_name')
        .eq('portal', portal)
        .order('area_name'),
      supabase
        .from('portal_acronyms')
        .select('acronym, full_term')
        .eq('portal', portal)
        .order('acronym')
    ]);

    setCategories(categoriesRes.data || []);
    setLegalAreas(legalAreasRes.data || []);
    setAcronyms(acronymsRes.data || []);
    setLoading(false);
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadPrompt(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentPortal = portals.find(p => p.portal === selectedPortal);
  const portalName = currentPortal?.name || selectedPortal;
  // Tool name from OpenAPI spec: https://soavtttwnswalynemlxr.supabase.co/functions/v1/naevneneshus-mcp/openapi.json
  const operationId = 'Afgp';

  const systemPrompt = generateSystemPrompt(
    portalName,
    selectedPortal,
    operationId,
    categories,
    legalAreas,
    acronyms
  );

  const quickGuide = generateQuickGuide(portalName, operationId, selectedPortal);

  const exampleQueries = generateExampleQueries(selectedPortal, categories, acronyms);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">OpenWebUI System Prompts</h1>
        <p className="text-gray-600">
          Copy-paste klar system prompts til hver portal - optimeret til OpenWebUI 0.6.32
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Vælg Portal
        </label>
        <select
          value={selectedPortal}
          onChange={(e) => setSelectedPortal(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {portals.map((portal) => (
            <option key={portal.portal} value={portal.portal}>
              {portal.name} ({portal.portal})
            </option>
          ))}
        </select>
        {currentPortal?.domain_focus && (
          <p className="mt-2 text-sm text-gray-600">
            Fokusområde: {currentPortal.domain_focus}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('system')}
              className={`px-6 py-4 font-medium text-sm transition ${
                activeTab === 'system'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              System Prompt
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-6 py-4 font-medium text-sm transition ${
                activeTab === 'guide'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quick Guide
            </button>
            <button
              onClick={() => setActiveTab('examples')}
              className={`px-6 py-4 font-medium text-sm transition ${
                activeTab === 'examples'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <SearchIcon className="w-4 h-4 inline mr-2" />
              Eksempler
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'system' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Komplet System Prompt til {portalName}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(systemPrompt, 'system')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        {copied === 'system' ? (
                          <>
                            <Check className="w-4 h-4" />
                            Kopieret!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Kopier
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => downloadPrompt(systemPrompt, `${selectedPortal}_system_prompt.txt`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                      {systemPrompt}
                    </pre>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Sådan bruges:</strong> I OpenWebUI, gå til Settings → Models → Vælg din model →
                      System Prompt → Indsæt ovenstående tekst
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'guide' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Kort Guide til {portalName}
                    </h3>
                    <button
                      onClick={() => copyToClipboard(quickGuide, 'guide')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      {copied === 'guide' ? (
                        <>
                          <Check className="w-4 h-4" />
                          Kopieret!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Kopier
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                      {quickGuide}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'examples' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Eksempel-forespørgsler for {portalName}
                  </h3>
                  <div className="space-y-3">
                    {exampleQueries.map((query, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium mb-1">{query.title}</p>
                          <code className="text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            {query.query}
                          </code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(query.query, `example-${idx}`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          {copied === `example-${idx}` ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h4 className="font-semibold text-gray-900 mb-2">Kategorier</h4>
          <p className="text-sm text-gray-600 mb-3">
            {categories.length} kategorier tilgængelige
          </p>
          <div className="max-h-48 overflow-y-auto">
            {categories.slice(0, 10).map((cat, idx) => (
              <div key={idx} className="text-sm text-gray-700 py-1">
                • {cat.category_title}
              </div>
            ))}
            {categories.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                + {categories.length - 10} flere...
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h4 className="font-semibold text-gray-900 mb-2">Akronymer</h4>
          <p className="text-sm text-gray-600 mb-3">
            {acronyms.length} almindelige forkortelser
          </p>
          <div className="max-h-48 overflow-y-auto">
            {acronyms.map((acr, idx) => (
              <div key={idx} className="text-sm text-gray-700 py-1">
                <span className="font-semibold">{acr.acronym}</span> → {acr.full_term}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateSystemPrompt(
  portalName: string,
  portalDomain: string,
  operationId: string,
  categories: Category[],
  legalAreas: LegalArea[],
  _acronyms: Acronym[]
): string {
  const categoryList = categories.map(c => `  • ${c.category_title}`).join('\n');
  const legalAreaList = legalAreas.map(l => `  - ${l.area_name}`).join('\n');

  const acronymTable = categories
    .flatMap(cat => {
      const aliases = cat.aliases || [];
      return aliases
        .filter(alias => alias.length <= 5 && /^[A-ZÆØÅ]+$/.test(alias))
        .map(alias => `  ${alias.padEnd(10)} → ${cat.category_title}`);
    })
    .join('\n');

  const stopwordsList = 'praksis, afgørelse, afgørelser, kendelse, kendelser, dom, domme, sag, sager, om, ved, for, til, søgning, søg, find, finde, vise, vis, alle, og, eller, samt, i, af, på, med, fra';

  return `SYSTEM PROMPT — ${portalName} Search Tool

Du skal kalde værktøjet "${operationId}" for søgninger på ${portalName} (${portalDomain}).

🎯 DIN OPGAVE
1. Optimér brugerens query
2. Identificér akronymer
3. Kald værktøj med ren query + akronym

📋 QUERY OPTIMERING (Dit Ansvar)

Trin 1: Fjern stopwords
Liste: ${stopwordsList}

Trin 2: Rens § henvisninger
- Fjern dubletter: "§ 72 § 72" → "§ 72"
- Fjern stopword-suffikser: "§ 72-praksis" → "§ 72"
- Behold første forekomst

Trin 3: Identificér akronym fra tabellen
Akronymer (send som detectedAcronym parameter):
${acronymTable || '  (ingen akronymer registreret)'}

Trin 4: Fjern akronym fra query
"Bevisbyrde MBL § 72" → "Bevisbyrde § 72"

📞 VÆRKTØJSKALD

{
  "query": "Bevisbyrde § 72",
  "detectedAcronym": "MBL",
  "portal": "${portalDomain}"
}

✅ KOMPLETTE EKSEMPLER

Eksempel 1:
Input: "Bevisbyrde ved MBL § 72 og søgning om § 72-praksis"
1. Fjern stopwords: ved, og, søgning, om → "Bevisbyrde MBL § 72 § 72-praksis"
2. Rens §: § 72 § 72-praksis → § 72 → "Bevisbyrde MBL § 72"
3. Identificér: MBL → Miljøbeskyttelsesloven
4. Fjern MBL: "Bevisbyrde § 72"
5. Kald: {"query": "Bevisbyrde § 72", "detectedAcronym": "MBL"}

Eksempel 2:
Input: "praksis om NBL § 3 strandbeskyttelse"
1. Fjern: praksis, om → "NBL § 3 strandbeskyttelse"
2. § allerede ren
3. Identificér: NBL → Naturbeskyttelsesloven
4. Fjern NBL: "§ 3 strandbeskyttelse"
5. Kald: {"query": "§ 3 strandbeskyttelse", "detectedAcronym": "NBL"}

Eksempel 3:
Input: "støj fra vindmøller"
1. Fjern: fra → "støj vindmøller"
2. Ingen §
3. Intet akronym fundet
4. Kald: {"query": "støj vindmøller", "detectedAcronym": null}

⚠️ VIGTIGE REGLER

- Hvis INTET akronym findes, send detectedAcronym: null
- Fjern ALTID akronymet fra query hvis fundet
- Behold § henvisninger i query
- Brug "page_size" 5, medmindre andet ønskes
- Sæt "page" hvis brugeren beder om næste side

📊 PRÆSENTATION AF RESULTATER

Værktøjet returnerer struktureret data med følgende felter per resultat:
- id: Unik identifikator
- type: "ruling" (Afgørelse) eller "news" (Nyhed)
- url: Komplet URL klar til brug (allerede konstrueret med highlight-parameter for afgørelser)
- title: Titel
- cleanBody: Rent tekstindhold uden HTML (klar til læsning og sammenfatning)
- publicationDate: Udgivelsesdato
- caseNumber: Sagsnummer (hvis relevant)
- categories: Kategorier
- highlights: Relevante tekstuddrag

Dit job er at:
1. Læs cleanBody-feltet for hvert resultat
2. Lav en kort, naturlig sammenfatning (2-3 sætninger) på dansk
3. Præsentér hvert resultat som:
   • **[Titel](url)** (Type: Afgørelse/Nyhed)
   • Din AI-genererede sammenfatning baseret på cleanBody
   • Dato og sagsnummer hvis relevant
   • Adskil resultater med en blank linje

4. Brug URL'en direkte fra result.url - den er allerede konstrueret korrekt
5. For afgørelser indeholder URL'en automatisk highlight-parameter
6. For nyheder er URL'en uden highlight-parameter

Eksempel format:
**[Ophævelse af påbud om støjmåling](https://mfkn.naevneneshus.dk/afgoerelse/3597d8c0-bb7e-4e82-949f-8e54aee99914?highlight=Bevisbyrde%20%C2%A7%2072)** (Type: Afgørelse)
Miljø- og Fødevareklagenævnet ophævede Varde Kommunes påbud om støjmåling fra en skydebane. Sagen omhandler anvendelse af miljøbeskyttelseslovens § 72 vedrørende bevisbyrde.
Dato: 29-02-2024 | Sagsnr: 22/00421

Kategorier fra portalen (reference):
${categoryList || '  • (ingen kategorier registreret)'}`;
}

function generateQuickGuide(portalName: string, operationId: string, portal: string): string {
  return `QUICK GUIDE – ${portalName}

Rolle: Kald værktøjet "${operationId}" med brugerens søgetekst og returnér værktøjets formaterede svar.

Sådan gør du:
- Brug brugerens tekst som "query"-argument.
- Sæt "portal"="${portal}" og "page_size"=5 (medmindre brugeren beder om andet).
- Hvis brugeren beder om næste side, opdater "page"-argumentet tilsvarende.

📊 Præsentation af Resultater:
- Læs cleanBody fra hvert resultat
- Lav AI-genererede sammenfatninger (2-3 sætninger)
- Brug result.url direkte som link (allerede korrekt konstrueret)
- Format: **[Titel](url)** (Type: Afgørelse/Nyhed) + sammenfatning + metadata
- Afgørelser har automatisk highlight i URL
- Nyheder har simpel URL uden highlight`;
}

function generateExampleQueries(
  portal: string,
  categories: Category[],
  acronyms: Acronym[]
): Array<{ title: string; query: string }> {
  const examples: Array<{ title: string; query: string }> = [];

  if (portal === 'mfkn.naevneneshus.dk') {
    examples.push(
      { title: 'Søg efter støj-afgørelser', query: 'Find afgørelser om støj' },
      { title: 'Jordforurening med kategori', query: 'Søg jordforurening, kategori: Jordforureningsloven' },
      { title: 'Paragraf-søgning', query: 'Find afgørelser om § 72' },
      { title: 'PFAS forurening', query: 'Søg PFAS-forurening' },
      { title: 'Naturtyper', query: 'Afgørelser om beskyttede naturtyper' }
    );
  } else if (portal === 'ekn.naevneneshus.dk') {
    examples.push(
      { title: 'Vindmøller', query: 'Find afgørelser om vindmøller' },
      { title: 'Solceller', query: 'Søg solcelleanlæg' },
      { title: 'Elforsyning', query: 'Afgørelser om elforsyning' }
    );
  } else if (portal === 'pkn.naevneneshus.dk') {
    examples.push(
      { title: 'Lokalplaner', query: 'Find afgørelser om lokalplaner' },
      { title: 'Sommerhuse', query: 'Søg sommerhusområder' },
      { title: 'Landzoner', query: 'Afgørelser i landzone' }
    );
  } else {
    examples.push(
      { title: 'Generel søgning', query: 'Find relevante afgørelser' },
      { title: 'Med kategori', query: `Søg med kategori: ${categories[0]?.category_title || 'Kategori'}` }
    );
  }

  if (categories.length > 0) {
    examples.push({
      title: `Filtreret på ${categories[0].category_title}`,
      query: `Søgning, kategori: ${categories[0].category_title}`
    });
  }

  if (acronyms.length > 0) {
    examples.push({
      title: `Brug akronym: ${acronyms[0].acronym}`,
      query: `Find afgørelser om ${acronyms[0].acronym}`
    });
  }

  return examples;
}
