import { useMemo, useState } from 'react';
import { FONT_AWESOME_ICONS } from '../../../../constants/image/fontAwesomeIcons';
import {
  buildFontAwesomeDownloadName,
  filterFontAwesomeIcons,
  getActiveUnicode,
  validateFontAwesomeExport,
} from '../../../../utils/image/fontAwesomeToPng/fontAwesomeUtils';
import { downloadBlob } from '../../../../utils/fileUtils';
import { clientErrorMessage } from '../../../../utils/apiError';
import { renderFontAwesomeToPng } from '../../../../utils/image/fontAwesomeToPng/fontAwesomeCanvas';
import { useToolPersistence } from '../../../../hooks/useToolPersistence';

const DEFAULT_ICON = FONT_AWESOME_ICONS[0];

export function useFontAwesomePng() {
  const [search, setSearch] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICON);
  const [customUnicode, setCustomUnicode] = useState('');
  const [size, setSize] = useState(128);
  const [color, setColor] = useState('#000000');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [resultBlob, setResultBlob] = useState(null);

  const filteredIcons = useMemo(() => filterFontAwesomeIcons(FONT_AWESOME_ICONS, search), [search]);

  const activeUnicode = getActiveUnicode(selectedIcon, customUnicode);

  const hasContent =
    Boolean(resultBlob) ||
    Boolean(customUnicode.trim()) ||
    selectedIcon?.name !== DEFAULT_ICON?.name ||
    size !== 128 ||
    color !== '#000000';

  useToolPersistence({
    snapshot: { selectedIcon, customUnicode, size, color, resultBlob },
    hasContent,
    warnOnUnload: true,
    onRestore: (s) => {
      if (s.selectedIcon) setSelectedIcon(s.selectedIcon);
      if (typeof s.customUnicode === 'string') setCustomUnicode(s.customUnicode);
      if (typeof s.size === 'number') setSize(s.size);
      if (typeof s.color === 'string') setColor(s.color);
      if (s.resultBlob instanceof Blob) setResultBlob(s.resultBlob);
    },
  });

  const clearResult = () => setResultBlob(null);

  const handleSelectIcon = (icon) => {
    setSelectedIcon(icon);
    setCustomUnicode('');
    clearResult();
  };

  const handleCustomUnicodeChange = (value) => {
    setCustomUnicode(value);
    clearResult();
  };

  const handleSizeChange = (value) => {
    setSize(value);
    clearResult();
  };

  const handleColorChange = (value) => {
    setColor(value);
    clearResult();
  };

  const handleGenerate = async () => {
    const validationError = validateFontAwesomeExport({ activeUnicode, size });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await renderFontAwesomeToPng(activeUnicode, size, color);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, buildFontAwesomeDownloadName(selectedIcon?.name, size));
  };

  return {
    search,
    setSearch,
    selectedIcon,
    customUnicode,
    size,
    color,
    isProcessing,
    error,
    resultBlob,
    filteredIcons,
    activeUnicode,
    handleSelectIcon,
    handleCustomUnicodeChange,
    handleSizeChange,
    handleColorChange,
    handleGenerate,
    handleDownload,
  };
}
