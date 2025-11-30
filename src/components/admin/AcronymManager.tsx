import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface Acronym {
  id: string;
  portal: string;
  acronym: string;
  full_term: string;
  created_at: string;
}

export function AcronymManager() {
  const [acronyms, setAcronyms] = useState<Acronym[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ acronym: string; fullTerm: string }>({
    acronym: '',
    fullTerm: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchAcronyms();
  }, [selectedPortal]);

  async function fetchAcronyms() {
    setLoading(true);
    try {
      let query = supabase
        .from('portal_acronyms')
        .select('*')
        .order('acronym');

      if (selectedPortal !== 'all') {
        query = query.eq('portal', selectedPortal);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAcronyms(data || []);
    } catch (error) {
      console.error('Error fetching acronyms:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(acronym: Acronym) {
    try {
      const { error } = await supabase
        .from('portal_acronyms')
        .update({
          acronym: editForm.acronym,
          full_term: editForm.fullTerm
        })
        .eq('id', acronym.id);

      if (error) throw error;

      setEditingId(null);
      fetchAcronyms();
    } catch (error) {
      console.error('Error updating acronym:', error);
      alert('Failed to update acronym');
    }
  }

  async function handleDelete(acronym: Acronym) {
    if (!confirm(`Are you sure you want to delete "${acronym.acronym}"?`)) return;

    try {
      const { error } = await supabase
        .from('portal_acronyms')
        .delete()
        .eq('id', acronym.id);

      if (error) throw error;
      fetchAcronyms();
    } catch (error) {
      console.error('Error deleting acronym:', error);
      alert('Failed to delete acronym');
    }
  }

  async function handleAdd() {
    if (!editForm.acronym.trim() || !editForm.fullTerm.trim()) {
      alert('Please fill in both fields');
      return;
    }

    if (selectedPortal === 'all') {
      alert('Please select a specific portal to add acronym');
      return;
    }

    try {
      const { error } = await supabase
        .from('portal_acronyms')
        .insert({
          portal: selectedPortal,
          acronym: editForm.acronym,
          full_term: editForm.fullTerm
        });

      if (error) throw error;

      setShowAddForm(false);
      setEditForm({ acronym: '', fullTerm: '' });
      fetchAcronyms();
    } catch (error) {
      console.error('Error adding acronym:', error);
      alert('Failed to add acronym');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Acronym Manager</h1>
        <p className="text-gray-600">Manage approved acronyms across all portals</p>
        <div className="mt-4 flex items-center gap-4">
          <select
            value={selectedPortal}
            onChange={(e) => setSelectedPortal(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Portals</option>
            <option value="mfkn.naevneneshus.dk">MFKN</option>
            <option value="pkn.naevneneshus.dk">PKN</option>
            <option value="ekn.naevneneshus.dk">EKN</option>
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={selectedPortal === 'all' || showAddForm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add Acronym
          </button>
          <span className="text-sm text-gray-600">{acronyms.length} acronyms</span>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Acronym</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acronym</label>
              <input
                type="text"
                value={editForm.acronym}
                onChange={(e) => setEditForm({ ...editForm, acronym: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., MBL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Term</label>
              <input
                type="text"
                value={editForm.fullTerm}
                onChange={(e) => setEditForm({ ...editForm, fullTerm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Miljøbeskyttelsesloven"
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
                setEditForm({ acronym: '', fullTerm: '' });
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
                Acronym
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Full Term
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
            {acronyms.map((acronym) => (
              <tr key={acronym.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === acronym.id ? (
                    <input
                      type="text"
                      value={editForm.acronym}
                      onChange={(e) => setEditForm({ ...editForm, acronym: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <span className="font-semibold text-blue-600">{acronym.acronym}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === acronym.id ? (
                    <input
                      type="text"
                      value={editForm.fullTerm}
                      onChange={(e) => setEditForm({ ...editForm, fullTerm: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <span className="text-gray-900">{acronym.full_term}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {acronym.portal.replace('.naevneneshus.dk', '')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {editingId === acronym.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSave(acronym)}
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
                          setEditingId(acronym.id);
                          setEditForm({
                            acronym: acronym.acronym,
                            fullTerm: acronym.full_term
                          });
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(acronym)}
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

        {acronyms.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No acronyms found. Add one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
