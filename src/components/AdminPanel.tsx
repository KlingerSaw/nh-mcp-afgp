import { useState } from 'react';
import { MetadataSuggestions } from './admin/MetadataSuggestions';
import { AcronymManager } from './admin/AcronymManager';
import { SynonymManager } from './admin/SynonymManager';
import { Lightbulb, BookA, FileText } from 'lucide-react';

export function AdminPanel() {
  const [activeView, setActiveView] = useState<'suggestions' | 'acronyms' | 'synonyms'>('suggestions');

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
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeView === 'suggestions' && <MetadataSuggestions />}
        {activeView === 'acronyms' && <AcronymManager />}
        {activeView === 'synonyms' && <SynonymManager />}
      </div>
    </div>
  );
}
