import { supabase } from './supabase';

export interface ResolvedCategory {
  id: string;
  title: string;
  matchedAlias: string;
}

export async function fetchCategoriesForPortal(portal: string) {
  const { data, error } = await supabase
    .from('site_categories')
    .select('*')
    .eq('portal', portal);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

export async function resolveCategoryFromQuery(
  query: string,
  portal: string
): Promise<ResolvedCategory | null> {
  const categories = await fetchCategoriesForPortal(portal);

  if (!categories || categories.length === 0) {
    return null;
  }

  const queryUpper = query.toUpperCase();
  const queryWords = query.split(/\s+/).map(w => w.toUpperCase());

  for (const category of categories) {
    const aliases = category.aliases || [];

    for (const alias of aliases) {
      const aliasUpper = alias.toUpperCase();

      if (queryWords.includes(aliasUpper) || queryUpper.includes(aliasUpper)) {
        return {
          id: category.category_id,
          title: category.category_title,
          matchedAlias: alias,
        };
      }
    }
  }

  return null;
}

export function removeMatchedAliasFromQuery(query: string, matchedAlias: string): string {
  const regex = new RegExp(`\\b${matchedAlias}\\b`, 'gi');
  return query.replace(regex, '').replace(/\s+/g, ' ').trim();
}
