interface PortalCategory {
  category_id: string;
  category_title: string;
  aliases: string[];
}

interface CategoryParseResult {
  categoryId: string;
  categoryTitle: string;
  cleanedQuery: string;
  matchedValue: string;
  source: 'explicit' | 'implicit';
}

const CATEGORY_ACRONYMS: Record<string, string> = {
  'FM': 'Fredning mv.',
  'JFL': 'Jordforureningsloven',
  'MBL': 'Miljøbeskyttelsesloven',
  'MOV': 'Miljømålsloven og vandplanlægningsloven',
  'MAKP': 'Miljøvurdering af konkrete projekter',
  'MAPOP': 'Miljøvurdering af planer og programmer',
  'ØL': 'Øvrige lovområder',
  'RL': 'Råstofloven',
  'SL': 'Skovloven',
  'VL': 'Vandløbsloven',
  'NBL': 'Naturbeskyttelsesloven',
  'PL': 'Planloven',
  'HDL': 'Husdyrloven',
};

export function parseCategoryFromQuery(
  query: string,
  categories: PortalCategory[]
): CategoryParseResult | null {
  const categoryPattern = /,?\s*(?:kategori|lovområde|category):\s*([^,\n]+)/i;
  const match = query.match(categoryPattern);

  if (!match) {
    return null;
  }

  const categoryValue = match[1].trim();
  const cleanedQuery = query.replace(match[0], '').trim();

  const resolvedCategory = resolveCategoryValue(categoryValue, categories);

  if (!resolvedCategory) {
    console.warn(`Could not resolve category: "${categoryValue}"`);
    return null;
  }

  return {
    categoryId: resolvedCategory.id,
    categoryTitle: resolvedCategory.title,
    cleanedQuery,
    matchedValue: categoryValue,
    source: 'explicit',
  };
}

function resolveCategoryValue(
  value: string,
  categories: PortalCategory[]
): { id: string; title: string } | null {
  const normalizedValue = value.toLowerCase().trim();
  const upperValue = value.toUpperCase().trim();

  if (CATEGORY_ACRONYMS[upperValue]) {
    const fullName = CATEGORY_ACRONYMS[upperValue];
    return findCategoryByTitle(fullName, categories);
  }

  for (const category of categories) {
    if (category.category_title.toLowerCase() === normalizedValue) {
      return {
        id: category.category_id,
        title: category.category_title,
      };
    }

    const aliases = category.aliases || [];
    for (const alias of aliases) {
      if (alias.toLowerCase() === normalizedValue || alias.toUpperCase() === upperValue) {
        return {
          id: category.category_id,
          title: category.category_title,
        };
      }
    }
  }

  return null;
}

function findCategoryByTitle(
  title: string,
  categories: PortalCategory[]
): { id: string; title: string } | null {
  const normalizedTitle = title.toLowerCase();

  for (const category of categories) {
    if (category.category_title.toLowerCase() === normalizedTitle) {
      return {
        id: category.category_id,
        title: category.category_title,
      };
    }

    const aliases = category.aliases || [];
    for (const alias of aliases) {
      if (alias.toLowerCase().includes(normalizedTitle) || normalizedTitle.includes(alias.toLowerCase())) {
        return {
          id: category.category_id,
          title: category.category_title,
        };
      }
    }
  }

  return null;
}