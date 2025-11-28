export interface CategoryOption {
  id: string;
  name: string;
  aliases: string[];
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAliases(name: string) {
  const base = normalize(name);
  const aliases = new Set<string>([base]);

  const squashed = base.replace(/\s+/g, '');
  if (squashed) aliases.add(squashed);

  const words = base.split(' ').filter(Boolean);
  if (words.length > 1) {
    const initials = words.map((w) => w[0]).join('');
    if (initials.length > 1) aliases.add(initials);
  }

  return Array.from(aliases);
}

function collectObjectsWithIdAndName(value: any, collector: Set<any>) {
  if (!value) return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectsWithIdAndName(item, collector));
    return;
  }

  if (typeof value === 'object') {
    if ('id' in value && ('name' in value || 'title' in value)) {
      collector.add(value);
    }

    Object.values(value).forEach((v) => collectObjectsWithIdAndName(v, collector));
  }
}

export function extractCategoriesFromSettings(settings: any): CategoryOption[] {
  const rawCategories = new Set<any>();
  collectObjectsWithIdAndName(settings, rawCategories);

  const categories: CategoryOption[] = [];
  const seen = new Set<string>();

  for (const cat of rawCategories) {
    const id = String((cat as any).id ?? '').trim();
    const name = String((cat as any).name ?? (cat as any).title ?? '').trim();

    if (!id || !name || seen.has(id)) continue;

    const aliases = new Set<string>(buildAliases(name));

    if (Array.isArray((cat as any).synonyms)) {
      (cat as any).synonyms
        .map((s: any) => String(s ?? '').trim())
        .filter(Boolean)
        .forEach((syn: string) => buildAliases(syn).forEach((alias) => aliases.add(alias)));
    }

    if (Array.isArray((cat as any).aliases)) {
      (cat as any).aliases
        .map((s: any) => String(s ?? '').trim())
        .filter(Boolean)
        .forEach((syn: string) => buildAliases(syn).forEach((alias) => aliases.add(alias)));
    }

    categories.push({
      id,
      name,
      aliases: Array.from(aliases),
    });
    seen.add(id);
  }

  return categories;
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function isFuzzyMatch(token: string, aliases: string[]) {
  const normalizedToken = normalize(token);
  return aliases.some((alias) => {
    const distance = levenshtein(normalizedToken, alias);
    if (alias.length <= 4) {
      return distance === 0;
    }
    return distance <= 1 || (alias.length >= 8 && distance <= 2);
  });
}

export function resolveCategoryFromQuery(
  query: string,
  categories: CategoryOption[],
  explicitCategoryInput?: string
) {
  const lowerQuery = normalize(query);
  const tokens = lowerQuery.split(' ').filter(Boolean);

  const findMatch = (tokenList: string[]) => {
    for (const token of tokenList) {
      for (const category of categories) {
        if (isFuzzyMatch(token, category.aliases)) {
          return { category, matchedToken: token };
        }
      }
    }
    return null;
  };

  let match = findMatch(tokens);

  if (!match && explicitCategoryInput) {
    match = findMatch([explicitCategoryInput]);
  }

  if (!match) return null;

  const { category, matchedToken } = match;
  const pattern = new RegExp(`\\b${matchedToken.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
  const cleaned = query.replace(pattern, '').replace(/\s+/g, ' ').trim();

  return {
    categoryId: category.id,
    categoryName: category.name,
    cleanedQuery: cleaned,
    matchedAlias: matchedToken,
  };
}
