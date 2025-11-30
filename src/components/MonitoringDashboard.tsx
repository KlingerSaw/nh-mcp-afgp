import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Database, Search, RefreshCw, CheckCircle, XCircle, Clock, User, Globe, AlertTriangle, Trash2 } from 'lucide-react';

interface ConnectionLog {
  id: string;
  endpoint: string;
  method: string;
  user_agent: string;
  auth_type: string;
  ip_address: string;
  request_headers?: Record<string, string | null> | null;
  tools_discovered: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface QueryLog {
  id: string;
  portal: string;
  query: string;
  original_query?: string;
  optimized_query?: string;
  filters: {
    sort: number;
    categories: string[];
  } | null;
  result_count: number;
  execution_time_ms: number;
  error_message: string | null;
  user_identifier: string;
  created_at: string;
  search_payload?: any;
  api_response?: any;
  raw_request?: any;
  tool_response?: any;
}

interface Stats {
  totalConnections: number;
  successfulConnections: number;
  totalQueries: number;
  averageExecutionTime: number;
  toolsDiscovered: number;
  emptyResults: number;
  largeResults: number;
  errors: number;
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
    emptyResults: 0,
    largeResults: 0,
    errors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [deleting, setDeleting] = useState(false);

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
      .select('execution_time_ms, result_count, error_message');

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
      const emptyCount = queries.filter(q => q.result_count === 0 && !q.error_message).length;
      const largeCount = queries.filter(q => q.result_count > 50).length;
      const errorCount = queries.filter(q => q.error_message).length;

      setStats(prev => ({
        ...prev,
        totalQueries: queries.length,
        averageExecutionTime: Math.round(avgTime),
        emptyResults: emptyCount,
        largeResults: largeCount,
        errors: errorCount,
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

  const deleteAllLogs = async () => {
    if (!confirm('Er du sikker på at du vil slette alle logs? Dette kan ikke fortrydes.')) {
      return;
    }

    setDeleting(true);
    try {
      const [queryResult, connectionResult] = await Promise.all([
        supabase.from('query_logs').delete().gte('created_at', '1900-01-01'),
        supabase.from('connection_logs').delete().gte('created_at', '1900-01-01')
      ]);

      if (queryResult.error) throw queryResult.error;
      if (connectionResult.error) throw connectionResult.error;

      await refreshAll();
    } catch (error) {
      console.error('Error deleting logs:', error);
      alert('Der opstod en fejl ved sletning af logs');
    } finally {
      setDeleting(false);
    }
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
          event: '*',
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
          event: '*',
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
            <button
              onClick={deleteAllLogs}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              {deleting ? 'Sletter...' : 'Slet alle logs'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Total Connections</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.totalConnections}</p>
            <p className="text-xs text-slate-500 mt-1">Herunder OpenWebUI kald til /openapi.json</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-slate-600">Succesrate</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">
              {stats.totalConnections === 0
                ? '0%'
                : `${Math.round((stats.successfulConnections / stats.totalConnections) * 100)}%`}
            </p>
            <p className="text-xs text-slate-500 mt-1">{stats.successfulConnections} af {stats.totalConnections} forbindelser</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Search className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-slate-600">Total Queries</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{stats.totalQueries}</p>
            <p className="text-xs text-slate-500 mt-1">Seneste søgninger fra tools</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-slate-600">Tools discovered</span>
            </div>
            <p className="text-3xl font-bold text-indigo-600">{stats.toolsDiscovered}</p>
            <p className="text-xs text-slate-500 mt-1">Beregnet fra OpenAPI kald</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-slate-600">Avg Response</span>
            </div>
            <p className="text-3xl font-bold text-indigo-600">{stats.averageExecutionTime}ms</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-slate-600">Empty Results</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.emptyResults}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Search className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-slate-600">Large Results (&gt;50)</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{stats.largeResults}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-slate-600">Errors</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.errors}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Connection Logs
            </h2>
            <p className="text-sm text-slate-600 mt-1">Overvåg OpenWebUI kald til funktionen og OpenAPI spec'en</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {connectionLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Ingen forbindelser endnu</p>
                <p className="text-sm mt-1">Når OpenWebUI henter /openapi.json eller kalder tools vises de her</p>
              </div>
            ) : (
              connectionLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          log.success
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                        <span className="text-slate-700 font-mono text-xs">{log.method}</span>
                        <span className="text-slate-900 font-medium">{log.endpoint}</span>
                      </div>
                      <div className="text-xs text-slate-600">User-Agent: {log.user_agent}</div>
                      <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.auth_type || 'none'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {log.ip_address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          {log.tools_discovered} tools
                        </span>
                      </div>
                      {log.request_headers && (
                        <div className="text-xs text-slate-500">
                          Host: {log.request_headers['host'] || 'ukendt'} • Accept: {log.request_headers['accept'] || 'n/a'}
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded border border-red-100">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {formatRelativeTime(log.created_at)}
                    </div>
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
              queryLogs.map((log) => {
                return (
                  <div key={log.id} className="border-b border-slate-200 last:border-b-0">
                    <div className="p-4 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            {log.original_query && log.original_query !== log.query && (
                              <div className="text-sm text-slate-500 mb-1">
                                <span className="font-semibold">Original:</span> "{log.original_query}"
                              </div>
                            )}
                            {log.query && (log.optimized_query || log.original_query !== log.query) && (
                              <div className="text-sm text-slate-700 mb-1">
                                <span className="font-semibold">OpenWebUI:</span> "{log.query}"
                              </div>
                            )}
                            {log.optimized_query && (
                              <div className="font-medium text-slate-900 mb-1">
                                <span className="font-semibold">Søgt med:</span> <span className="text-blue-600">"{log.optimized_query}"</span>
                              </div>
                            )}
                            {!log.optimized_query && (
                              <div className="font-medium text-slate-900 mb-1">
                                <span className="font-semibold">Søgt med:</span> "{log.query}"
                              </div>
                            )}
                            <div className="text-sm text-slate-600 mt-2">
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

                          {log.error_message && (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-3 h-3" />
                              Error
                            </span>
                          )}
                        </div>

                        {(log.raw_request || log.search_payload || log.api_response || log.tool_response) && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                              📋 Vis Payload & Response
                            </summary>
                            <div className="mt-2 space-y-3">
                              {log.raw_request && (
                                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                  <div className="text-xs font-semibold text-slate-700 mb-1">Original MCP-request:</div>
                                  <pre className="text-xs text-slate-800 overflow-x-auto">
                                    {JSON.stringify(log.raw_request, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.search_payload && (
                                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                  <div className="text-xs font-semibold text-slate-700 mb-1">Search Payload:</div>
                                  <pre className="text-xs text-slate-800 overflow-x-auto">
                                    {JSON.stringify(log.search_payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.api_response && (
                                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                  <div className="text-xs font-semibold text-slate-700 mb-1">API Response:</div>
                                  <pre className="text-xs text-slate-800 overflow-x-auto">
                                    {JSON.stringify(log.api_response, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.tool_response && (
                                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                  <div className="text-xs font-semibold text-slate-700 mb-1">Svar tilbage til tool:</div>
                                  <pre className="text-xs text-slate-800 overflow-x-auto">
                                    {JSON.stringify(log.tool_response, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        )}

                        {log.error_message && (
                          <div className="text-red-600 text-xs bg-red-50 p-2 rounded mt-2">
                            {log.error_message}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
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
