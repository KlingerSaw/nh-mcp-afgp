import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Database, Search, RefreshCw, CheckCircle, XCircle, Clock, User, Globe } from 'lucide-react';

interface ConnectionLog {
  id: string;
  endpoint: string;
  method: string;
  user_agent: string;
  auth_type: string;
  ip_address: string;
  tools_discovered: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface QueryLog {
  id: string;
  portal: string;
  query: string;
  result_count: number;
  execution_time_ms: number;
  error_message: string | null;
  user_identifier: string;
  created_at: string;
}

interface Stats {
  totalConnections: number;
  successfulConnections: number;
  totalQueries: number;
  averageExecutionTime: number;
  toolsDiscovered: number;
}

export function MonitoringDashboard() {
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);
  const [queryLogs, setQueryLogs] = useState<QueryLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalConnections: 0,
    successfulConnections: 0,
    totalQueries: 0,
    averageExecutionTime: 0,
    toolsDiscovered: 0,
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchConnectionLogs = async () => {
    const { data, error } = await supabase
      .from('connection_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setConnectionLogs(data);
    }
  };

  const fetchQueryLogs = async () => {
    const { data, error } = await supabase
      .from('query_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setQueryLogs(data);
    }
  };

  const fetchStats = async () => {
    const { data: connections } = await supabase
      .from('connection_logs')
      .select('success, tools_discovered');

    const { data: queries } = await supabase
      .from('query_logs')
      .select('execution_time_ms, result_count');

    if (connections) {
      const successful = connections.filter(c => c.success).length;
      const toolsCount = Math.max(...connections.map(c => c.tools_discovered || 0), 0);

      setStats(prev => ({
        ...prev,
        totalConnections: connections.length,
        successfulConnections: successful,
        toolsDiscovered: toolsCount,
      }));
    }

    if (queries && queries.length > 0) {
      const avgTime = queries.reduce((sum, q) => sum + (q.execution_time_ms || 0), 0) / queries.length;
      setStats(prev => ({
        ...prev,
        totalQueries: queries.length,
        averageExecutionTime: Math.round(avgTime),
      }));
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchConnectionLogs(),
      fetchQueryLogs(),
      fetchStats(),
    ]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshAll();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    const channel = supabase
      .channel('monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_logs',
        },
        () => {
          fetchConnectionLogs();
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'query_logs',
        },
        () => {
          fetchQueryLogs();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s siden`;
    if (diffMins < 60) return `${diffMins}m siden`;
    if (diffHours < 24) return `${diffHours}t siden`;
    return formatDate(dateString);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              Monitoring Dashboard
            </h1>
            <p className="text-slate-600 mt-1">
              Real-time monitoring af OpenWebUI integration og API kald
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              Sidst opdateret: {lastUpdate.toLocaleTimeString('da-DK')}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Auto-refresh</span>
            </label>
            <button
              onClick={refreshAll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Opdater
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Total Connections</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalConnections}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-slate-600">Successful</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.successfulConnections}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-600">Tools Discovered</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.toolsDiscovered}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Search className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-slate-600">Total Queries</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{stats.totalQueries}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-slate-600">Avg Response</span>
            </div>
            <p className="text-3xl font-bold text-indigo-600">{stats.averageExecutionTime}ms</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                OpenAPI Connections
              </h2>
              <p className="text-sm text-slate-600 mt-1">Seneste OpenAPI spec requests</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {connectionLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Database className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Ingen connections endnu</p>
                  <p className="text-sm mt-1">Vent på OpenWebUI kalder API'et</p>
                </div>
              ) : (
                connectionLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {log.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="font-medium text-slate-900">
                          {log.method} {log.endpoint}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>

                    <div className="ml-6 space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-3 h-3" />
                        <span className="font-mono text-xs">{log.user_agent || 'Unknown'}</span>
                      </div>

                      <div className="flex items-center gap-4 text-slate-600">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Auth:</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.auth_type === 'Bearer'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {log.auth_type}
                          </span>
                        </span>

                        {log.tools_discovered > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Tools:</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                              {log.tools_discovered}
                            </span>
                          </span>
                        )}
                      </div>

                      {log.error_message && (
                        <div className="text-red-600 text-xs bg-red-50 p-2 rounded mt-2">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-orange-600" />
                Query Logs
              </h2>
              <p className="text-sm text-slate-600 mt-1">Seneste søgninger fra tools</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {queryLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Ingen queries endnu</p>
                  <p className="text-sm mt-1">Vent på tools bliver brugt</p>
                </div>
              ) : (
                queryLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 mb-1">
                          "{log.query}"
                        </div>
                        <div className="text-sm text-slate-600">
                          Portal: <span className="font-mono text-xs">{log.portal}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 ml-4">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className={`flex items-center gap-1 ${
                        log.result_count > 0 ? 'text-green-600' : 'text-slate-600'
                      }`}>
                        <Database className="w-3 h-3" />
                        {log.result_count} resultater
                      </span>

                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3 h-3" />
                        {log.execution_time_ms}ms
                      </span>

                      {log.user_identifier && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <User className="w-3 h-3" />
                          {log.user_identifier}
                        </span>
                      )}
                    </div>

                    {log.error_message && (
                      <div className="text-red-600 text-xs bg-red-50 p-2 rounded mt-2">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Monitoring Status
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>✅ Real-time subscriptions er aktive</p>
            <p>✅ Auto-refresh hver 5 sekund {autoRefresh ? '(aktivt)' : '(deaktiveret)'}</p>
            <p>✅ Viser de seneste 20 logs fra hver kategori</p>
            {stats.toolsDiscovered > 0 && (
              <p className="font-semibold text-green-700">
                🎯 {stats.toolsDiscovered} tools er blevet discovered af OpenWebUI!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
