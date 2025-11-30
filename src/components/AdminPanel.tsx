import { useState } from 'react';
import { MetadataSuggestions } from './admin/MetadataSuggestions';
import { AcronymManager } from './admin/AcronymManager';
import { SynonymManager } from './admin/SynonymManager';
import { UnknownAcronymsPanel } from './admin/UnknownAcronymsPanel';
import { Lightbulb, BookA, FileText, RefreshCcw, AlertTriangle } from 'lucide-react';

export function AdminPanel() {
  const [activeView, setActiveView] = useState<'suggestions' | 'acronyms' | 'synonyms' | 'unknown'>('suggestions');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function handleRefreshAll() {
    setRefreshing(true);
    setRefreshMessage('Starter opdatering af alle portaler...');

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${baseUrl}/functions/v1/collect-portal-data?action=refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Kunne ikke opdatere portaler');
      }

      const syncResponse = await fetch(`${baseUrl}/functions/v1/sync-categories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(syncData?.error || 'Kunne ikke synkronisere lovområder/kategorier');
      }

      const analyzedCount = data?.analysis?.portalsAnalyzed ?? 0;
      const syncedSites = syncData?.results?.length ?? 0;
      setRefreshMessage(
        `Opdatering fuldført. ${analyzedCount} portaler analyseret og ${syncedSites} portaler synkroniseret med lovområder og forkortelser.`
      );
    } catch (error: any) {
      setRefreshMessage(`Fejl under opdatering: ${error?.message || error}`);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Panel</h2>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('suggestions')}
              className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition ${
                activeView === 'suggestions'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Lightbulb className="w-5 h-5 mr-3" />
              Suggestions
            </button>
            <button
              onClick={() => setActiveView('acronyms')}
              className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition ${
                activeView === 'acronyms'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookA className="w-5 h-5 mr-3" />
              Acronyms
            </button>
            <button
              onClick={() => setActiveView('synonyms')}
              className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition ${
                activeView === 'synonyms'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5 mr-3" />
              Synonyms
            </button>
            <button
              onClick={() => setActiveView('unknown')}
              className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition ${
                activeView === 'unknown'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle className="w-5 h-5 mr-3" />
              Unknown Acronyms
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Portal metadata</h3>
            <p className="text-sm text-gray-600">Indsaml data og regenerér akronymer og synonymer på tværs af alle portaler.</p>
            {refreshMessage && (
              <p className="text-sm text-gray-700 mt-2">{refreshMessage}</p>
            )}
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition ${
              refreshing ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCcw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Opdaterer...' : 'Opdater alle portaler'}
          </button>
        </div>

        <div className="p-6">
          {activeView === 'suggestions' && <MetadataSuggestions />}
          {activeView === 'acronyms' && <AcronymManager />}
          {activeView === 'synonyms' && <SynonymManager />}
          {activeView === 'unknown' && <UnknownAcronymsPanel />}
        </div>
      </div>
    </div>
  );
}
