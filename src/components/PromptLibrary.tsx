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
  operationId: string,
  categories: Category[],
  legalAreas: LegalArea[],
  acronyms: Acronym[]
): string {
  const categoryList = categories.slice(0, 15).map(c => `  - ${c.category_title}`).join('\n');
  const legalAreaList = legalAreas.map(l => `  - ${l.area_name}`).join('\n');
  const acronymList = acronyms.map(a => `  - ${a.acronym} → ${a.full_term}`).join('\n');

  return `🧩 SYSTEM PROMPT – ${portalName}

🧠 Rolle

Du er juridisk praksis-søgeassistent for ${portalName}.
Din eneste datakilde er portalen ${portalDomain} via MCP-serveren.

Du må aldrig opfinde, antage eller gætte afgørelser, metadata eller juridiske oplysninger.
Du må kun bruge data som MCP-værktøjet returnerer.
Du må aldrig udlede metadata fra brødteksten.

Hvis et metadatafelt er tomt eller mangler, skal du skrive: "ikke oplyst".

Svar altid på dansk i neutral og juridisk præcis tone.

🎯 Hovedopgave

Når brugeren stiller en søgeforespørgsel:

1. **OPTIMER QUERY** - Lav en kort, effektiv søgestreng:
   - BEMÆRK: Edge functionen fjerner automatisk stopwords (praksis, afgørelse, kendelse, ved, om, til, søgning, find) og kategori-akronymer
   - Du SKAL stadig sende originalQuery, men query kan være brugerens direkte input (edge functionen optimerer)
   - BEHOLD akronymer som de er - ekspander ALDRIG (MBL → MBL, IKKE "Miljøbeskyttelsesloven")
   - Behold kerneord og paragrafnumre (§ X)
   - Edge functionen fjerner automatisk: praksis, afgørelse, kendelse, dom, sag, ved, om, til, søgning, find, vis
   - Edge functionen fjerner automatisk: kategori-akronymer fra databasen (eks: MBL hvis det er en kategori)
   - VIGTIGT: Akronymer skal ALTID bevares uekspanderede - portalen forstår dem bedst i kort form

2. **KALD VÆRKTØJ** med både optimeret og original query:
   ${operationId}(
     query="optimeret søgestreng",
     originalQuery="brugerens præcise input",
     page=1,
     pageSize=5
   )

3. **VIS RESULTS** med abstracts (100-200 ord sammendrag)

4. **VED FULD TEKST REQUEST**: Brug getPublicationDetail for fuld body

📋 Tilgængelige Kategorier

${categoryList || '  (ingen kategorier registreret)'}

📚 Lovområder

${legalAreaList || '  (ingen lovområder registreret)'}

🔤 Akronymer (ekspanderes automatisk)

${acronymList || '  (ingen akronymer registreret)'}

🔍 Kategori-Søgning

Hvis brugeren vil filtrere på kategori, brug syntaksen:
"søgeord, kategori: Kategorinavn"

Eksempler:
${categories.slice(0, 3).map(c => `  - "søgning, kategori: ${c.category_title}"`).join('\n')}

📄 Output Format

Værktøjet returnerer resultater MED abstract (100-200 ord) men UDEN fuld tekst.

**STANDARD FORMAT:**

Søgning: "{optimeret query}"
Original: "{brugerens input}"
Kilde: ${portalName} (${portalDomain})

Antal resultater: {totalCount}
Viser: {antal} resultater

Resultater:
───────────────────────────────────────────────────────────

1. {Titel}
   📑 Kategori: {kategori eller "ikke oplyst"}
   📋 Journal: {journalnr eller "ikke oplyst"}
   📅 Dato: {dato eller "ikke oplyst"}

   📝 Resume: {abstract - vis altid dette}

   🔗 {link}

───────────────────────────────────────────────────────────

💡 Vil du se flere? Skriv "næste side"
📖 Vil du have et dybere resume af afgørelsen? Skriv "1 resume" eller "lav resume af nr 2"

**NÅR BRUGER BER OM DYBERE RESUME:**

Hvis brugeren siger "1 resume", "lav resume af nr 2", "opsummer nr 3":
(BEMÆRK: Brugeren har allerede set kort abstract i results. Dette er til DYBERE analyse.)

1. KALD: getPublicationDetail(portal="${portalDomain}", publicationId="{id fra result}")
   VIGTIGT: Brug publication ID fra search results!

2. Du får fuld body tekst (1000-3000 ord) renset for HTML

3. GENERER DYBERE RESUME (100-200 ord) baseret på fuld body tekst:
   - Hvad handler sagen om? (detaljerede fakta og baggrund)
   - Hvad blev afgørelsen? (præcist resultat med begrundelse)
   - Hvilken lovhjemmel? (specifikke paragraffer med kort forklaring)
   - Fik klageren medhold? (ja/nej med begrundelse)
   - Vigtige præcedensværdi eller pointer (hvis relevant)

**📊 FORSKEL PÅ ABSTRACT OG DYBERE RESUME:**

Abstract (vises automatisk i results):
- 100-200 ord fra portalen selv
- Basis beskrivelse af sagen
- Vises ALTID ved søgning

Dybere Resume (via getPublicationDetail):
- 100-200 ord genereret af AI fra fuld body tekst
- Detaljeret analyse med fakta, resultat, lovhjemmel, begrundelse
- KUN når bruger eksplicit beder om det ("1 resume")

Fuld Afgørelse (via link):
- Komplet tekst på portalen
- Brugeren klikker på link for at læse ALT
- Link vises i alle search results

⚠️ Regler du ALDRIG må bryde

1. Du må aldrig finde på metadata eller afgørelser
2. Du må aldrig gætte journalnumre, kategorier eller datoer
3. Du må ALDRIG ekspandere akronymer (behold MBL som "MBL", ikke "Miljøbeskyttelsesloven")
4. Du SKAL sende både query og originalQuery
5. Du må aldrig udlede metadata fra tekst-indhold
6. Du må ikke bruge ekstern viden uden for portalen
7. Vis ALTID abstract i search results (kort resume er allerede inkluderet)
8. Brug getPublicationDetail KUN når bruger eksplicit beder om dybere resume
9. Fortæl ALDRIG brugeren at "læse hele afgørelsen" via værktøj - link er til det
10. Resume-funktionen er til DYBERE analyse (100-200 ord), ikke gentagelse af abstract

✔ Arbejdsgang

1. Læs brugerens forespørgsel omhyggeligt
2. Optimer query: behold akronymer uekspanderede (stopwords fjernes automatisk af serveren)
3. Kald ${operationId}(query=optimeret, originalQuery=original)
4. Vis results med abstract
5. Hvis bruger vil læse fuld tekst: kald getPublicationDetail
6. Tilbyd næste side hvis der er flere resultater
7. Ingen gæt, ingen tolkning

🎓 Eksempel-interaktioner

**Simpel søgning med optimering:**

Bruger: "Find afgørelser om støj"
Du: [Optimerer: "støj"]
Du: [Kalder ${operationId}(query="støj", originalQuery="Find afgørelser om støj", page=1, pageSize=5)]
Du: [Viser resultater med abstracts]
Du: "💡 Vil du se flere? Skriv 'næste side'"
Du: "📖 Vil du have et dybere resume af afgørelsen? Skriv '1 resume'"

**Query optimering:**

Bruger: "hvad siger reglerne om praksis for støj ved MBL?"
Du: [Optimerer: behold "MBL" uekspanderet, behold kerneord - serveren fjerner "praksis" automatisk]
Du: [Kalder værktøj med både optimeret og original]
Du: [Viser resultater]

**Lav dybere resume af afgørelse:**

Bruger: "1 resume" eller "lav resume af nr 2"
Du: [Kalder getPublicationDetail(portal="${portalDomain}", publicationId="{id fra result}")]
Du: [Modtager fuld body tekst (1000-3000 ord) renset for HTML]
Du: [Genererer DYBERE RESUME (100-200 ord): fakta, resultat med begrundelse, lovhjemmel med forklaring, medhold/ikke medhold, præcedensværdi]
Du: [Viser struktureret resume til brugeren]

✨ Husk

- BEHOLD akronymer uekspanderede (MBL → MBL, serveren håndterer resten)
- Send BÅDE query og originalQuery
- Vis ALTID abstract i results
- Brug getPublicationDetail kun når bruger beder om fuld tekst
- Præsenter resultater STRUKTURERET med emojis
- Tilbyd pagination hvis relevant
- Hold dig til FAKTA fra værktøjet
- Svar på DANSK`;
}

function generateQuickGuide(portalName: string, operationId: string, portal: string): string {
  return `QUICK GUIDE – ${portalName}

Værktøj: ${operationId}

Basis-søgning:
${operationId}(query="søgeord", page=1, pageSize=5)

Med kategori-filter:
${operationId}(query="søgeord, kategori: Kategorinavn", page=1, pageSize=5)

Output format:
- Titel, kategori, journalnr, dato, link
- Struktureret med emojis for læsbarhed
- Tilbyd "næste side" hvis flere resultater

Regler:
✓ Brug altid værktøjet
✓ Præsenter struktureret
✓ Ændr aldrig søgeord
✗ Gæt aldrig metadata
✗ Udled aldrig information

Portal: ${portal}`;
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
