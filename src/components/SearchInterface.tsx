import { useEffect, useMemo, useState } from 'react';
import { mcpClient, SearchParams, CategoryFilter } from '../lib/mcpClient';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import { resolveCategoryFromQuery, removeMatchedAliasFromQuery, ResolvedCategory } from '../lib/categoryResolver';

const DEFAULT_PORTALS = [
  { value: 'fkn.naevneneshus.dk', label: 'Forbrugerklagenævnet' },
  { value: 'pkn.naevneneshus.dk', label: 'Planklagenævnet' },
  { value: 'mfkn.naevneneshus.dk', label: 'Miljø og Fødevareklagenævnet' },
  { value: 'dkbb.naevneneshus.dk', label: 'Disciplinær- og klagenævnet for beskikkede bygningssagkyndige' },
  { value: 'dnfe.naevneneshus.dk', label: 'Disciplinærnævnet for Ejendomsmæglere' },
  { value: 'klfu.naevneneshus.dk', label: 'Klagenævnet for Udbud' },
  { value: 'tele.naevneneshus.dk', label: 'Teleklagenævnet' },
  { value: 'rn.naevneneshus.dk', label: 'Revisornævnet' },
  { value: 'apv.naevneneshus.dk', label: 'Ankenævnet for Patenter og Varemærker' },
  { value: 'tvist.naevneneshus.dk', label: 'Tvistighedsnævnet' },
  { value: 'ean.naevneneshus.dk', label: 'Erhvervsankenævnet' },
  { value: 'byf.naevneneshus.dk', label: 'Byfornyelsesnævnene' },
  { value: 'ekn.naevneneshus.dk', label: 'Energiklagenævnet' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30];

export function SearchInterface() {
  const [portals, setPortals] = useState<{ value: string; label: string }[]>(DEFAULT_PORTALS);
  const [portal, setPortal] = useState(DEFAULT_PORTALS[0].value);
  const [query, setQuery] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transformationDetails, setTransformationDetails] = useState<{
    originalQuery: string;
    cleanedQuery: string;
    optimizedQuery: string;
    removedFillerWords: string[];
  } | null>(null);
  const [resolvedCategory, setResolvedCategory] = useState<ResolvedCategory | null>(null);
  const [requestPayload, setRequestPayload] = useState<string | null>(null);
  const [responsePayload, setResponsePayload] = useState<string | null>(null);

  const fillerWords = useMemo(
    () =>
      new Set([
        'og',
        'eller',
        'i',
        'på',
        'for',
        'af',
        'at',
        'der',
        'det',
        'den',
        'de',
        'en',
        'et',
        'som',
        'med',
        'til',
        'the',
        'a',
        'an',
      ]),
    []
  );

  useEffect(() => {
    async function loadPortals() {
      try {
        const { portals: fetchedPortals } = await mcpClient.getPortals();
        if (Array.isArray(fetchedPortals) && fetchedPortals.length > 0) {
          const portalObjects = fetchedPortals.map((p: string) => {
            const existing = DEFAULT_PORTALS.find(dp => dp.value === p);
            return existing || { value: p, label: p };
          });
          setPortals(portalObjects);
          setPortal(portalObjects[0].value);
        }
      } catch (err) {
        console.error('Failed to load portals, using defaults', err);
        setPortals(DEFAULT_PORTALS);
        setPortal(DEFAULT_PORTALS[0].value);
      }
    }

    loadPortals();
  }, []);


  function transformQuery(rawQuery: string) {
    const cleanedQuery = rawQuery.replace(/\s+/g, ' ').trim();

    let processedQuery = cleanedQuery;
    processedQuery = processedQuery.replace(/§\s+(\d+)/g, '§ $1');

    const tokens = processedQuery.match(/"[^"]+"|§\s+\d+[\w-]*|[^\s]+/g) || [];
    const removedFillerWords: string[] = [];
    const processed: string[] = [];

    tokens.forEach((token) => {
      const normalized = token.replace(/^["']|["']$/g, '');
      const lower = normalized.toLowerCase();

      if (['and', '&&', 'og', 'eller', 'or'].includes(lower)) {
        removedFillerWords.push(normalized);
        return;
      }

      if (fillerWords.has(lower)) {
        removedFillerWords.push(normalized);
        return;
      }

      if (normalized.match(/§\s+\d+/)) {
        processed.push(`"${normalized}"`);
      } else if (normalized.includes(' ')) {
        processed.push(`"${normalized}"`);
      } else if (normalized === '§') {
        processed.push(`"§"`);
      } else if (/^\d+$/.test(normalized)) {
        processed.push(`"${normalized}"`);
      } else {
        processed.push(normalized);
      }
    });

    const optimizedParts: string[] = [];
    for (let i = 0; i < processed.length; i++) {
      const current = processed[i];

      if (i > 0) {
        optimizedParts.push('AND');
      }

      optimizedParts.push(current);
    }

    const optimizedQuery = optimizedParts.join(' ');

    const details = {
      originalQuery: rawQuery,
      cleanedQuery,
      optimizedQuery,
      removedFillerWords,
    };

    setTransformationDetails(details);
    return details;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const cleanedQuery = query.replace(/\s+/g, ' ').trim();
    if (!cleanedQuery) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setRequestPayload(null);
    setResponsePayload(null);
    setResolvedCategory(null);

    try {
      let workingQuery = cleanedQuery;
      const categories: CategoryFilter[] = [];

      const resolved = await resolveCategoryFromQuery(cleanedQuery, portal);

      if (resolved) {
        categories.push({
          id: resolved.id,
          title: resolved.title,
        });
        workingQuery = removeMatchedAliasFromQuery(cleanedQuery, resolved.matchedAlias);
        setResolvedCategory(resolved);
      }

      const transformed = transformQuery(workingQuery);

      const params: SearchParams = {
        portal,
        query: transformed.optimizedQuery,
        categories: categories.length > 0 ? categories : undefined,
        sort: 'Score',
        types: [],
        skip: 0,
        size: pageSize,
        originalQuery: cleanedQuery,
      };

      setRequestPayload(JSON.stringify(params, null, 2));

      const data = await mcpClient.search(params);
      setResults(data);
      setResponsePayload(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Naevneneshus Search
          </h1>
          <p className="text-lg text-gray-600">
            Search across multiple Danish appeals boards
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Portal
              </label>
              <select
                value={portal}
                onChange={(e) => setPortal(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {portals.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your search query..."
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Tip: use quotes for exact phrases and AND/OR for Boolean boosting.
              </p>
            </div>

            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-gray-700">Advanced filters</span>
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                {showAdvanced ? 'Hide options' : 'Show options'}
              </button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Results per page</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} results
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From date</label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To date</label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {(dateStart || dateEnd || resolvedCategory) && (
                  <div className="md:col-span-2 flex items-center justify-between bg-white border border-blue-100 rounded-lg px-4 py-3">
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">Active filters</p>
                      <p className="text-gray-600">
                        {resolvedCategory && (
                          <span className="mr-2">
                            Category: {resolvedCategory.title} (matched: {resolvedCategory.matchedAlias})
                          </span>
                        )}
                        {(dateStart || dateEnd) && (
                          <span>
                            Date: {dateStart || 'Any'} → {dateEnd || 'Any'}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDateStart('');
                        setDateEnd('');
                        setResolvedCategory(null);
                      }}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </button>
          </form>
        </div>

        {(transformationDetails || requestPayload || responsePayload) && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Search translation</h3>
                <p className="text-sm text-gray-600">
                  We prepare your query for Elasticsearch (Boolean operators, quotes, wildcards, and filler-word removal)
                </p>
              </div>
            </div>

            {transformationDetails && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Original</p>
                  <p className="text-sm text-gray-900 break-words">{transformationDetails.originalQuery}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Optimized query</p>
                  <p className="text-sm text-blue-800 font-mono break-words">
                    {transformationDetails.optimizedQuery || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Removed filler words</p>
                  <p className="text-sm text-gray-900 break-words">
                    {transformationDetails.removedFillerWords.length > 0
                      ? transformationDetails.removedFillerWords.join(', ')
                      : 'None'}
                  </p>
                </div>
              </div>
            )}

            {resolvedCategory && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-700 uppercase tracking-wide">Category detected</p>
                <p className="text-sm text-blue-900 font-medium">
                  Matched "{resolvedCategory.matchedAlias}" → {resolvedCategory.title}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  We removed the matched word from the query and applied the category filter automatically.
                </p>
              </div>
            )}

            {(requestPayload || responsePayload) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requestPayload && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Payload sent to API</p>
                    <pre className="bg-gray-900 text-green-200 text-xs rounded-lg p-4 overflow-x-auto">
                      {requestPayload}
                    </pre>
                  </div>
                )}

                {responsePayload && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Payload returned from API</p>
                    <pre className="bg-gray-900 text-blue-200 text-xs rounded-lg p-4 overflow-x-auto">
                      {responsePayload}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {results && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Search Results
              </h2>
              <p className="text-gray-600">
                Found {results.totalCount} {results.totalCount === 1 ? 'result' : 'results'}
                {results.meta && (
                  <span className="ml-2 text-sm">
                    ({results.meta.executionTime}ms)
                  </span>
                )}
              </p>
            </div>

            {results.categoryCounts && results.categoryCounts.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {results.categoryCounts.map((cat: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {cat.category}: {cat.count}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {results.publications?.length > 0 ? (
                results.publications.map((pub: any) => (
                  <div
                    key={pub.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {pub.title || 'Untitled'}
                    </h3>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {pub.categories?.map((cat: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1 mb-4">
                      {pub.jnr && pub.jnr.length > 0 && (
                        <p>Journal: {pub.jnr.join(', ')}</p>
                      )}
                      {pub.date && <p>Date: {pub.date}</p>}
                      {pub.authority && <p>Authority: {pub.authority}</p>}
                    </div>

                    <a
                      href={`https://${portal}/${pub.type === 'news' ? 'nyhed' : 'afgoerelse'}/${pub.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View full document
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No publications found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
