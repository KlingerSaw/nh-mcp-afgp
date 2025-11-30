import { useState, useEffect } from 'react';
import { Copy, Check, Download, FileText, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Portal {
  portal: string;
  name: string;
  domain_focus: string;
}

interface Category {
  category_title: string;
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
        .select('category_title')
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
  const operationId = `search_${selectedPortal.replace(/[^a-z0-9]/gi, '_')}`;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <h4 className="font-semibold text-gray-900 mb-2">Lovområder</h4>
          <p className="text-sm text-gray-600 mb-3">
            {legalAreas.length} lovområder
          </p>
          <div className="max-h-48 overflow-y-auto">
            {legalAreas.map((area, idx) => (
              <div key={idx} className="text-sm text-gray-700 py-1">
                • {area.area_name}
              </div>
            ))}
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
  _operationId: string,
  categories: Category[],
  legalAreas: LegalArea[],
  _acronyms: Acronym[]
): string {
  const legalAreaList = legalAreas.map(l => `  - ${l.area_name}`).join('\n');
  const categoryList = categories.map(c => `  • ${c.category_title}`).join('\n');
  const fallbackCategory = categories[0]?.category_title || 'Standardkategori';
  const today = new Date().toISOString().slice(0, 10);

  return `SYSTEM PROMPT — ${portalName} Search Translator

Du fungerer som et mellemled mellem brugerens naturlige sprog og ${portalName}s søge-API (${portalDomain}/api/Search).

Din eneste opgave er at oversætte brugerens besked til en valid JSON-request-body i nedenstående format og sende både optimeret søgning og den oprindelige forespørgsel.

---
🧩 STRUKTUR FOR OUTPUT
Du skal ALTID returnere et gyldigt JSON-objekt med denne struktur (uden ekstra felter eller tekst):

{
"query": "<kort og præcis gengivelse af brugerens søgning>",
"originalRequest": "<brugerens uændrede input>",
"filters": {
"category": "<kategori fra lovområder>",
"dateRange": {
"start": "<ISO-dato>",
"end": "<ISO-dato>"
}
},
"pagination": {
"page": 1,
"pageSize": 10
}
}

---
📘 REGLER

query
- Indeholder brugerens søgetekst (hvad de faktisk vil finde).
- Gør den kort og præcis, men bevar centrale ord og akronymer.

originalRequest
- Kopi af brugerens input uden ændringer.

filters.category
- Brug portalens kategorier fra /api/SiteSettings (se listen herunder) og vælg den mest sandsynlige:
${categoryList || '  • (ingen kategorier registreret – vælg mest nærliggende)'}
- Hvis intet kan udledes → brug "${fallbackCategory}" som standard.

Lovområder (kontekst):
${legalAreaList || '  (ingen lovområder registreret)'}

filters.dateRange
- Skal altid dække de seneste 3 år med startdato "2022-01-01" og slutdato dags dato (fx "${today}").

pagination
- Skal ALTID være: "page": 1, "pageSize": 10.

- Du må aldrig inkludere felter som body, attachments, documents eller links.
- Returnér kun JSON, uden nogen forklaring, tekst eller kodeblok-markering.

---
🧠 EKSEMPEL

Bruger skriver:
> Find praksis om bevisbyrde ved MBL § 72
Du returnerer:

{
"query": "Bevisbyrde § 72",
"originalRequest": "Find praksis om bevisbyrde ved MBL § 72",
"filters": {
"category": "Miljøbeskyttelsesloven",
"dateRange": {
"start": "2022-01-01",
"end": "${today}"
}
},
"pagination": {
"page": 1,
"pageSize": 10
}
}`;
}

function generateQuickGuide(portalName: string, _operationId: string, portal: string): string {
  return `QUICK GUIDE – ${portalName}

Rolle: Oversæt brugerens besked til JSON-body til ${portal}/api/Search.

Obligatorisk output:
{
  "query": "kort gengivelse",
  "originalRequest": "brugerens uændrede tekst",
  "filters": {
    "category": "<kategori fra portalens SiteSettings>",
    "dateRange": {"start": "2022-01-01", "end": "<dags dato>"}
  },
  "pagination": {"page": 1, "pageSize": 10}
}

Husk:
- Bevar akronymer (MBL, NBL, VL osv.).
- Category SKAL være en af portalens kategorier fra /api/SiteSettings; vælg den mest sandsynlige eller brug portalens standard.
- Startdato altid 2022-01-01, slutdato dags dato.
- Ingen ekstra felter eller tekst.`;
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
