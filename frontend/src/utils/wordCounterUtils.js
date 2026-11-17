/**
 * Highly optimized text metrics calculator.
 * Avoids heavy array allocation for smooth real-time typing performance.
 * * @param {string} text - Raw input from the text editor
 * @returns {Object} Analytical text statistics
 */
export const computeTextStats = (text) => {
  if (!text) {
    return {
      characters: 0,
      charactersNoSpaces: 0,
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
    };
  }

  // 1. Character Metrics (O(1) & O(N) replacements)
  const characters = text.length;
  // Match everything except whitespace characters
  const charactersNoSpaces = (text.match(/\S/g) || []).length;

  // 2. Word Metrics
  // Match sequences of non-whitespace characters to find words safely
  const wordCount = (text.trim().match(/\S+/g) || []).length;

  // 3. Sentence Metrics
  // Looks for boundary punctuation marks or treats a non-empty string without periods as 1 sentence
  const sentenceCount =
    text.trim() === '' ? 0 : (text.match(/[^.!?]+([.!?]+|\b)(?=\s|$)/g) || []).length;

  // 4. Paragraph Metrics
  // Counts chunks separated by line breaks, omitting purely blank string fragments
  const paragraphCount = text.split(/\n+/).filter((line) => line.trim() !== '').length;

  return {
    characters,
    charactersNoSpaces,
    wordCount,
    sentenceCount,
    paragraphCount,
  };
};
