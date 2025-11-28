import { useEffect, useState } from 'react';
import { supabase, QueryLog } from '../lib/supabase';
import { AlertTriangle, Activity, Clock, Search } from 'lucide-react';

export function Dashboard() {
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    emptyResults: 0,
    largeResults: 0,
    errors: 0,
  });

  useEffect(() => {
    loadLogs();

    const subscription = supabase
      .channel('query_logs_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'query_logs' },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadLogs() {
    try {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data, error } = await supabase
        .from('query_logs')
        .select('*')
        .gte('created_at', twoWeeksAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLogs(data || []);

      const total = data?.length || 0;
      const emptyResults = data?.filter(log => log.result_count === 0 && !log.error_message).length || 0;
      const largeResults = data?.filter(log => log.result_count > 50).length || 0;
      const errors = data?.filter(log => log.error_message).length || 0;

      setStats({ total, emptyResults, largeResults, errors });
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const alertLogs = logs.filter(
    log => (log.result_count === 0 && !log.error_message) || log.result_count > 50
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Naevneneshus MCP Monitor
          </h1>
          <p className="text-gray-600">Query logs from the last 14 days</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Activity className="w-6 h-6" />}
            label="Total Queries"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={<AlertTriangle className="w-6 h-6" />}
            label="Empty Results"
            value={stats.emptyResults}
            color="yellow"
            alert={stats.emptyResults > 0}
          />
          <StatCard
            icon={<Search className="w-6 h-6" />}
            label="Large Results (>50)"
            value={stats.largeResults}
            color="orange"
            alert={stats.largeResults > 0}
          />
          <StatCard
            icon={<AlertTriangle className="w-6 h-6" />}
            label="Errors"
            value={stats.errors}
            color="red"
            alert={stats.errors > 0}
          />
        </div>

        {alertLogs.length > 0 && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                  Attention Required
                </h3>
                <p className="text-sm text-yellow-700">
                  {alertLogs.length} {alertLogs.length === 1 ? 'query' : 'queries'} with empty or excessive results detected
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Query History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Portal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Query
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Results
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={
                      log.error_message
                        ? 'bg-red-50'
                        : log.result_count === 0
                        ? 'bg-yellow-50'
                        : log.result_count > 50
                        ? 'bg-orange-50'
                        : ''
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.portal}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {log.query}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.result_count === 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : log.result_count > 50
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {log.result_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.execution_time_ms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.error_message ? (
                        <span className="inline-flex items-center text-red-600">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Error
                        </span>
                      ) : (
                        <span className="text-green-600">Success</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No queries logged in the last 14 days
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'orange' | 'red';
  alert?: boolean;
}

function StatCard({ icon, label, value, color, alert }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${alert ? 'ring-2 ring-yellow-400' : 'border-gray-200'}`}>
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{label}</p>
      </div>
    </div>
  );
}
