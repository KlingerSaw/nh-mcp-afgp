import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Clock, Sparkles } from 'lucide-react';

interface AcronymSuggestion {
  id: string;
  portal: string;
  acronym: string;
  full_term_suggestion: string | null;
  example_query: string;
  suggested_by: string;
  created_at: string;
}

interface SynonymSuggestion {
  id: string;
  portal: string;
  term: string;
  synonym_suggestions: string[];
  example_query: string;
  suggested_by: string;
  created_at: string;
}

export function MetadataSuggestions() {
  const [acronymSuggestions, setAcronymSuggestions] = useState<AcronymSuggestion[]>([]);
  const [synonymSuggestions, setSynonymSuggestions] = useState<SynonymSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [editingAcronym, setEditingAcronym] = useState<{id: string, fullTerm: string} | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, [selectedPortal]);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      let acronymQuery = supabase
        .from('suggested_acronyms')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      let synonymQuery = supabase
        .from('suggested_synonyms')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (selectedPortal !== 'all') {
        acronymQuery = acronymQuery.eq('portal', selectedPortal);
        synonymQuery = synonymQuery.eq('portal', selectedPortal);
      }

      const [{ data: acronyms }, { data: synonyms }] = await Promise.all([
        acronymQuery,
        synonymQuery
      ]);

      setAcronymSuggestions(acronyms || []);
      setSynonymSuggestions(synonyms || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcronymApproval(suggestion: AcronymSuggestion) {
    const fullTerm = editingAcronym?.id === suggestion.id
      ? editingAcronym.fullTerm
      : suggestion.full_term_suggestion;

    if (!fullTerm?.trim()) {
      alert('Please provide a full term expansion');
      return;
    }

    try {
      // Insert into portal_acronyms
      const { error: insertError } = await supabase
        .from('portal_acronyms')
        .insert({
          portal: suggestion.portal,
          acronym: suggestion.acronym,
          full_term: fullTerm
        });

      if (insertError) throw insertError;

      // Update status to approved
      const { error: updateError } = await supabase
        .from('suggested_acronyms')
        .update({ status: 'approved' })
        .eq('id', suggestion.id);

      if (updateError) throw updateError;

      // Log the review
      await supabase.from('suggestion_review_log').insert({
        suggestion_type: 'acronym',
        suggestion_id: suggestion.id,
        action: 'approved',
        reviewed_by: 'admin'
      });

      setEditingAcronym(null);
      fetchSuggestions();
    } catch (error) {
      console.error('Error approving acronym:', error);
      alert('Failed to approve acronym');
    }
  }

  async function handleAcronymRejection(suggestion: AcronymSuggestion) {
    try {
      const { error: updateError } = await supabase
        .from('suggested_acronyms')
        .update({ status: 'rejected' })
        .eq('id', suggestion.id);

      if (updateError) throw updateError;

      await supabase.from('suggestion_review_log').insert({
        suggestion_type: 'acronym',
        suggestion_id: suggestion.id,
        action: 'rejected',
        reviewed_by: 'admin'
      });

      fetchSuggestions();
    } catch (error) {
      console.error('Error rejecting acronym:', error);
      alert('Failed to reject acronym');
    }
  }

  async function handleSynonymApproval(suggestion: SynonymSuggestion) {
    try {
      // Check if term already has synonyms
      const { data: existing } = await supabase
        .from('portal_synonyms')
        .select('*')
        .eq('portal', suggestion.portal)
        .eq('term', suggestion.term)
        .maybeSingle();

      if (existing) {
        // Merge synonyms
        const mergedSynonyms = Array.from(new Set([
          ...(existing.synonyms || []),
          ...suggestion.synonym_suggestions
        ]));

        const { error } = await supabase
          .from('portal_synonyms')
          .update({ synonyms: mergedSynonyms })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('portal_synonyms')
          .insert({
            portal: suggestion.portal,
            term: suggestion.term,
            synonyms: suggestion.synonym_suggestions
          });

        if (error) throw error;
      }

      const { error: updateError } = await supabase
        .from('suggested_synonyms')
        .update({ status: 'approved' })
        .eq('id', suggestion.id);

      if (updateError) throw updateError;

      await supabase.from('suggestion_review_log').insert({
        suggestion_type: 'synonym',
        suggestion_id: suggestion.id,
        action: 'approved',
        reviewed_by: 'admin'
      });

      fetchSuggestions();
    } catch (error) {
      console.error('Error approving synonym:', error);
      alert('Failed to approve synonym');
    }
  }

  async function handleSynonymRejection(suggestion: SynonymSuggestion) {
    try {
      const { error: updateError } = await supabase
        .from('suggested_synonyms')
        .update({ status: 'rejected' })
        .eq('id', suggestion.id);

      if (updateError) throw updateError;

      await supabase.from('suggestion_review_log').insert({
        suggestion_type: 'synonym',
        suggestion_id: suggestion.id,
        action: 'rejected',
        reviewed_by: 'admin'
      });

      fetchSuggestions();
    } catch (error) {
      console.error('Error rejecting synonym:', error);
      alert('Failed to reject synonym');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPending = acronymSuggestions.length + synonymSuggestions.length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Metadata Suggestions</h1>
        <p className="text-gray-600">
          Review and approve AI-detected acronyms and synonyms
        </p>
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
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{totalPending} pending</span>
          </div>
        </div>
      </div>

      {/* Acronym Suggestions */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <BookA className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Acronym Suggestions ({acronymSuggestions.length})
          </h2>
        </div>

        {acronymSuggestions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No pending acronym suggestions
          </div>
        ) : (
          <div className="space-y-4">
            {acronymSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-blue-600">{suggestion.acronym}</span>
                      <span className="text-gray-400">→</span>
                      {editingAcronym?.id === suggestion.id ? (
                        <input
                          type="text"
                          value={editingAcronym.fullTerm}
                          onChange={(e) => setEditingAcronym({id: suggestion.id, fullTerm: e.target.value})}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter full term..."
                          autoFocus
                        />
                      ) : (
                        <span
                          className="text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => setEditingAcronym({
                            id: suggestion.id,
                            fullTerm: suggestion.full_term_suggestion || ''
                          })}
                        >
                          {suggestion.full_term_suggestion || 'Click to add...'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      <strong>Context:</strong> "{suggestion.example_query}"
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Portal: {suggestion.portal.replace('.naevneneshus.dk', '')}</span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {suggestion.suggested_by}
                      </span>
                      <span>{new Date(suggestion.created_at).toLocaleDateString('da-DK')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleAcronymApproval(suggestion)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                      title="Approve"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAcronymRejection(suggestion)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Synonym Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Synonym Suggestions ({synonymSuggestions.length})
          </h2>
        </div>

        {synonymSuggestions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No pending synonym suggestions
          </div>
        ) : (
          <div className="space-y-4">
            {synonymSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-purple-600">{suggestion.term}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-gray-900">{suggestion.synonym_suggestions.join(', ')}</span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      <strong>Context:</strong> "{suggestion.example_query}"
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Portal: {suggestion.portal.replace('.naevneneshus.dk', '')}</span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {suggestion.suggested_by}
                      </span>
                      <span>{new Date(suggestion.created_at).toLocaleDateString('da-DK')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleSynonymApproval(suggestion)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                      title="Approve"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSynonymRejection(suggestion)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookA({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">A</text>
    </svg>
  );
}
