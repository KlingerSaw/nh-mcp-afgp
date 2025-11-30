import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UnknownAcronym {
  id: string;
  portal: string;
  acronym: string;
  context_query: string;
  frequency: number;
  last_seen: string;
  reviewed: boolean;
}

interface Category {
  category_id: string;
  category_title: string;
}

export function UnknownAcronymsPanel() {
  const [acronyms, setAcronyms] = useState<UnknownAcronym[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [mappingAcronym, setMappingAcronym] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    loadAcronyms();
  }, [selectedPortal]);

  async function loadAcronyms() {
    setLoading(true);

    let query = supabase
      .from('unknown_acronyms')
      .select('*')
      .order('frequency', { ascending: false });

    if (selectedPortal !== 'all') {
      query = query.eq('portal', selectedPortal);
    }

    const { data } = await query;
    setAcronyms(data || []);
    setLoading(false);
  }

  async function loadCategoriesForPortal(portal: string) {
    const { data } = await supabase
      .from('site_categories')
      .select('category_id, category_title')
      .eq('portal', portal)
      .order('category_title');

    setCategories(data || []);
  }

  async function markAsReviewed(id: string) {
    await supabase
      .from('unknown_acronyms')
      .update({ reviewed: true })
      .eq('id', id);

    loadAcronyms();
  }

  async function deleteAcronym(id: string) {
    await supabase
      .from('unknown_acronyms')
      .delete()
      .eq('id', id);

    loadAcronyms();
  }

  async function startMapping(acronym: UnknownAcronym) {
    setMappingAcronym(acronym.id);
    setSelectedCategory('');
    await loadCategoriesForPortal(acronym.portal);
  }

  async function saveMapping(acronym: UnknownAcronym) {
    if (!selectedCategory) return;

    await supabase
      .from('unknown_acronyms')
      .update({
        mapped_to_category_id: selectedCategory,
        reviewed: true
      })
      .eq('id', acronym.id);

    const category = categories.find(c => c.category_id === selectedCategory);
    if (category) {
      const { data: existingCategory } = await supabase
        .from('site_categories')
        .select('aliases')
        .eq('category_id', selectedCategory)
        .single();

      const currentAliases = existingCategory?.aliases || [];
      if (!currentAliases.includes(acronym.acronym)) {
        await supabase
          .from('site_categories')
          .update({
            aliases: [...currentAliases, acronym.acronym]
          })
          .eq('category_id', selectedCategory);
      }
    }

    setMappingAcronym(null);
    loadAcronyms();
  }

  const unreviewedCount = acronyms.filter(a => !a.reviewed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Unknown Acronyms
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Acronyms detected by AI that are not in the database
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPortal}
            onChange={(e) => setSelectedPortal(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Portals</option>
            <option value="mfkn.naevneneshus.dk">MFKN</option>
            <option value="ekn.naevneneshus.dk">EKN</option>
            <option value="pkn.naevneneshus.dk">PKN</option>
          </select>

          <button
            onClick={loadAcronyms}
            className="p-2 text-gray-600 hover:text-gray-900 transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {unreviewedCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <strong>{unreviewedCount}</strong> unreviewed acronym{unreviewedCount !== 1 ? 's' : ''} need{unreviewedCount === 1 ? 's' : ''} attention
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : acronyms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No unknown acronyms found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acronym
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Portal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Context
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {acronyms.map((acronym) => (
                <tr key={acronym.id} className={acronym.reviewed ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-semibold text-blue-600">
                      {acronym.acronym}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {acronym.portal}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                    {acronym.context_query}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {acronym.frequency}x
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(acronym.last_seen).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {mappingAcronym === acronym.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select category...</option>
                          {categories.map((cat) => (
                            <option key={cat.category_id} value={cat.category_id}>
                              {cat.category_title}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveMapping(acronym)}
                          disabled={!selectedCategory}
                          className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-400"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setMappingAcronym(null)}
                          className="p-1 text-gray-600 hover:text-gray-700"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {!acronym.reviewed && (
                          <>
                            <button
                              onClick={() => startMapping(acronym)}
                              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                            >
                              Map to Category
                            </button>
                            <button
                              onClick={() => markAsReviewed(acronym.id)}
                              className="text-green-600 hover:text-green-700 text-xs font-medium"
                            >
                              Mark Reviewed
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteAcronym(acronym.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
