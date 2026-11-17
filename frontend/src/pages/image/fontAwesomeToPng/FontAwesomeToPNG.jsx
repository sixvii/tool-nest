import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import { useFontAwesomeCdn } from './hooks/useFontAwesomeCdn';
import { useFontAwesomePng } from './hooks/useFontAwesomePng';
import { FONT_AWESOME_TO_PNG_COPY } from '../../../constants/image/fontAwesomeToPng/fontAwesomeToPngConstants';
import FontAwesomePreviewPanel from './components/FontAwesomePreviewPanel';
import IconPickerGrid from './components/IconPickerGrid';
import IconExportSettings from './components/IconExportSettings';
import ImageLoader from '../../../components/loaders/ImageLoader';

export default function FontAwesomeToPNG() {
  useFontAwesomeCdn();

  const {
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
    handleSelectIcon,
    handleCustomUnicodeChange,
    handleSizeChange,
    handleColorChange,
    handleGenerate,
    handleDownload,
  } = useFontAwesomePng();

  return (
    <ImageToolPage
      title={FONT_AWESOME_TO_PNG_COPY.title}
      subtitle={FONT_AWESOME_TO_PNG_COPY.subtitle}
      error={error}
    >
      <ImageToolWorkspace
        showOptions
        isProcessing={isProcessing}
        preview={
          <FontAwesomePreviewPanel
            resultBlob={resultBlob}
            selectedIcon={selectedIcon}
            size={size}
            color={color}
            isProcessing={isProcessing}
            renderLoader={() => (
              <ImageLoader
                fileName={`${selectedIcon?.name ?? 'icon'}.png`}
                targetFormat="PNG"
                dimensions={`${size} × ${size}`}
              />
            )}
          />
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Generate PNG"
            applyingLabel="Generating..."
            downloadLabel="Download PNG"
            onApply={handleGenerate}
            onDownload={handleDownload}
            showDownload
            footer={
              isProcessing ? (
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  Generating PNG in your browser…
                </p>
              ) : null
            }
          >
            <IconPickerGrid
              search={search}
              onSearchChange={setSearch}
              icons={filteredIcons}
              selectedIcon={selectedIcon}
              customUnicode={customUnicode}
              onSelectIcon={handleSelectIcon}
            />

            <IconExportSettings
              customUnicode={customUnicode}
              onCustomUnicodeChange={handleCustomUnicodeChange}
              size={size}
              onSizeChange={handleSizeChange}
              color={color}
              onColorChange={handleColorChange}
            />
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
