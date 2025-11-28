import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SearchInterface } from './components/SearchInterface';
import { OpenWebUIGuide } from './components/OpenWebUIGuide';
import { PromptLibrary } from './components/PromptLibrary';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { BarChart3, Search, ExternalLink, FileText, Activity } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'integration' | 'prompts' | 'monitor' | 'stats'>('search');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Naevneneshus MCP
              </h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('search')}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'search'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </button>
              <button
                onClick={() => setActiveTab('integration')}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'integration'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Setup
              </button>
              <button
                onClick={() => setActiveTab('prompts')}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'prompts'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-5 h-5 mr-2" />
                Prompts
              </button>
              <button
                onClick={() => setActiveTab('monitor')}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'monitor'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Activity className="w-5 h-5 mr-2" />
                Monitor
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'stats'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Stats
              </button>
            </div>
          </div>
        </div>
      </nav>

      {activeTab === 'search' && <SearchInterface />}
      {activeTab === 'integration' && <OpenWebUIGuide />}
      {activeTab === 'prompts' && <PromptLibrary />}
      {activeTab === 'monitor' && <MonitoringDashboard />}
      {activeTab === 'stats' && <Dashboard />}
    </div>
  );
}

export default App;
