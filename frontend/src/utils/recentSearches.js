const STORAGE_KEY = 'tn_recent_searches';

export function loadRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentSearches(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addRecentSearch(categoryId, toolName, categoryTitle) {
  const list = loadRecentSearches();
  const entry = { categoryId, name: toolName, category: categoryTitle };
  const updated = [
    entry,
    ...list.filter((r) => !(r.categoryId === categoryId && r.name === toolName)),
  ].slice(0, 12);
  saveRecentSearches(updated);
  return updated;
}

export function removeRecentSearch(categoryId, toolName) {
  const updated = loadRecentSearches().filter(
    (r) => !(r.categoryId === categoryId && r.name === toolName)
  );
  saveRecentSearches(updated);
  return updated;
}

export function clearRecentSearches() {
  saveRecentSearches([]);
  return [];
}
