import { useState } from 'react';
import { mcpClient, SearchParams } from '../lib/mcpClient';
import { Search, Loader2, ExternalLink } from 'lucide-react';

const PORTALS = [
  'mfkn.naevneneshus.dk',
  'aen.naevneneshus.dk',
  'ekn.naevneneshus.dk',
  'pn.naevneneshus.dk',
];

export function SearchInterface() {
  const [portal, setPortal] = useState(PORTALS[0]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const params: SearchParams = {
        portal,
        query: query.trim(),
        page: 1,
        pageSize: 10,
      };

      const data = await mcpClient.search(params);
      setResults(data);
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
                {PORTALS.map((p) => (
                  <option key={p} value={p}>
                    {p}
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
            </div>

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
