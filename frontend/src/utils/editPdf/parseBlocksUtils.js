/**
 * Normalize parsePdf API response into `{ [pageIndex]: block[] }`
 * with stable `_id` keys used by the editor.
 */
export function normalizeParsedBlocks(parsed) {
  const byPage = {};
  for (const page of parsed?.pages ?? []) {
    const idx = page.page_index ?? 0;
    byPage[idx] = (page.blocks ?? []).map((block, i) => ({
      ...block,
      _id: `p_${idx}_${i}`,
    }));
  }
  return byPage;
}
