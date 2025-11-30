import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface Synonym {
  id: string;
  portal: string;
  term: string;
  synonyms: string[];
  created_at: string;
}

export function SynonymManager() {
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ term: string; synonyms: string }>({
    term: '',
    synonyms: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSynonyms();
  }, [selectedPortal]);

  async function fetchSynonyms() {
    setLoading(true);
    try {
      let query = supabase
        .from('portal_synonyms')
        .select('*')
        .order('term');

      if (selectedPortal !== 'all') {
        query = query.eq('portal', selectedPortal);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSynonyms(data || []);
    } catch (error) {
      console.error('Error fetching synonyms:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(synonym: Synonym) {
    try {
      const synonymArray = editForm.synonyms
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { error } = await supabase
        .from('portal_synonyms')
        .update({
          term: editForm.term,
          synonyms: synonymArray
        })
        .eq('id', synonym.id);

      if (error) throw error;

      setEditingId(null);
      fetchSynonyms();
    } catch (error) {
      console.error('Error updating synonym:', error);
      alert('Failed to update synonym');
    }
  }

  async function handleDelete(synonym: Synonym) {
    if (!confirm(`Are you sure you want to delete synonyms for "${synonym.term}"?`)) return;

    try {
      const { error } = await supabase
        .from('portal_synonyms')
        .delete()
        .eq('id', synonym.id);

      if (error) throw error;
      fetchSynonyms();
    } catch (error) {
      console.error('Error deleting synonym:', error);
      alert('Failed to delete synonym');
    }
  }

  async function handleAdd() {
    if (!editForm.term.trim() || !editForm.synonyms.trim()) {
      alert('Please fill in both fields');
      return;
    }

    if (selectedPortal === 'all') {
      alert('Please select a specific portal to add synonym');
      return;
    }

    try {
      const synonymArray = editForm.synonyms
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { error } = await supabase
        .from('portal_synonyms')
        .insert({
          portal: selectedPortal,
          term: editForm.term,
          synonyms: synonymArray
        });

      if (error) throw error;

      setShowAddForm(false);
      setEditForm({ term: '', synonyms: '' });
      fetchSynonyms();
    } catch (error) {
      console.error('Error adding synonym:', error);
      alert('Failed to add synonym');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Synonym Manager</h1>
        <p className="text-gray-600">Manage approved synonyms across all portals</p>
        <div className="mt-4 flex items-center gap-4">
          <select
            value={selectedPortal}
            onChange={(e) => setSelectedPortal(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Portals</option>
            <option value="mfkn.naevneneshus.dk">MFKN</option>
            <option value="pkn.naevneneshus.dk">PKN</option>
            <option value="ekn.naevneneshus.dk">EKN</option>
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={selectedPortal === 'all' || showAddForm}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add Synonym
          </button>
          <span className="text-sm text-gray-600">{synonyms.length} terms</span>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Synonym</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <input
                type="text"
                value={editForm.term}
                onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., bevisbyrde"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Synonyms (comma-separated)
              </label>
              <input
                type="text"
                value={editForm.synonyms}
                onChange={(e) => setEditForm({ ...editForm, synonyms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., beviskrav, dokumentationskrav"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditForm({ term: '', synonyms: '' });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Term
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Synonyms
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Portal
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {synonyms.map((synonym) => (
              <tr key={synonym.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === synonym.id ? (
                    <input
                      type="text"
                      value={editForm.term}
                      onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  ) : (
                    <span className="font-semibold text-purple-600">{synonym.term}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === synonym.id ? (
                    <input
                      type="text"
                      value={editForm.synonyms}
                      onChange={(e) => setEditForm({ ...editForm, synonyms: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="comma, separated, values"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {synonym.synonyms.map((syn, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {synonym.portal.replace('.naevneneshus.dk', '')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {editingId === synonym.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSave(synonym)}
                        className="p-1 text-green-600 hover:text-green-800"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(synonym.id);
                          setEditForm({
                            term: synonym.term,
                            synonyms: synonym.synonyms.join(', ')
                          });
                        }}
                        className="p-1 text-purple-600 hover:text-purple-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(synonym)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {synonyms.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No synonyms found. Add one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
