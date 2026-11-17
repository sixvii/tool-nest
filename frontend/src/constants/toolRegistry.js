import MergePdf from '../pages/pdf/MergePdf';
import SplitPdf from '../pages/pdf/SplitPdf';
import PdfRearrangeDelete from '../pages/pdf/PdfRearrangeDelete';
import PdfDelete from '../pages/pdf/PdfDelete';
import PdfRotate from '../pages/pdf/PdfRotate';
import PdfResize from '../pages/pdf/PdfResize';
import PdfCrop from '../pages/pdf/PdfCrop';
import PdfCompress from '../pages/pdf/PdfCompress';
import PdfProtect from '../pages/pdf/PdfProtect';
import PdfUnlock from '../pages/pdf/PdfUnlock';
import PdfToWord from '../pages/pdf/PdfToWord';
import WordToPdf from '../pages/pdf/WordToPdf';
import DocumentConverter from '../pages/pdf/DocumentConverter';
import ImagesToPdf from '../pages/pdf/ImagesToPdf';
import PdfToImages from '../pages/pdf/PdfToImages';
import PdfToData from '../pages/pdf/PdfToData';
import SpreadsheetConverter from '../pages/file/SpreadsheetConverter';
import FileSplitter from '../pages/file/FileSplitter';
import JSONFormatter from '../pages/file/JSONFormatter';
import XMLToCSV from '../pages/file/XMLToCSV';
import ImageResizer from '../pages/image/imageResizer/ImageResizer';
import ImageFormatConverter from '../pages/image/imageFormatConverter/ImageFormatConverter';
import CaseConverter from '../pages/text/CaseConverter';
import FindReplace from '../pages/text/FindReplace';
import Base64Tool from '../pages/file/Base64Tool';
import VideoFormatConverter from '../pages/video/VideoFormatConverter';
import AudioFormatConverter from '../pages/audio/AudioFormatConverter';
import AudioExtractor from '../pages/audio/AudioExtractor';
import VideoToAudioConverter from '../pages/audio/VideoToAudioConverter';
import AudioToVideoConverter from '../pages/audio/AudioToVideoConverter';
import VideoEditor from '../pages/video/VideoEditor';
import VideoTrimmer from '../pages/video/VideoTrimmer';
import VideoCompressor from '../pages/video/VideoCompressor';
import VideoResizer from '../pages/video/VideoResizer';
import ImageToText from '../pages/image/imageToText/ImageToText';
import ImageCompressor from '../pages/image/imageCompressor/ImageCompressor';
import AddBorder from '../pages/image/addBorder/AddBorder';
import WatermarkPdf from '../pages/pdf/WatermarkPdf';
import EditPdf from '../pages/pdf/editPdf/EditPdf';
import EsignPdf from '../pages/pdf/EsignPdf';
import ReplaceTextPdf from '../pages/pdf/ReplaceTextPdf';
import ExtractImagesPdf from '../pages/pdf/ExtractImagesPdf';
import ViewMetadata from '../pages/image/Viewmetadata';
import FontAwesomeToPNG from '../pages/image/fontAwesomeToPng/FontAwesomeToPNG';
import UrlToPdf from '../pages/web/UrlToPdf';
import XMLJSONConverter from '../pages/file/XmlJsonConverter';
import ImageSplitter from '../pages/image/imageSplitter/ImageSplitter';
import BlurBackground from '../pages/image/blurBackground/BlurBackground';
import CSVToXML from '../pages/file/CsvToXml';
import CSVJSONConverter from '../pages/file/CSVJSONConverter';
import RoundImage from '../pages/image/roundImage/RoundImage';
import FlipImage from '../pages/image/flipImage/FlipImage';
import BlackAndWhite from '../pages/image/blackAndWhite/BlackAndWhite';
import CropImage from '../pages/image/cropImage/CropImage';
import ExcelToXML from '../pages/file/ExcelToXML';
import XmlToExcel from '../pages/file/XmlToExcel';
import AddTextToImage from '../pages/image/addTextToImage/AddTextToImage';
import TransparentBackground from '../pages/image/TransparentBackground';
import CollageMaker from '../pages/image/CollageMaker/CollageMaker';
import ProfilePhotoMaker from '../pages/image/profilePhotoMaker/ProfilePhotoMaker';
import PixelateImage from '../pages/image/pixelateImage/PixelateImage';
import WordCounter from '../pages/text/WordCounter';

export const TOOL_NAMES = {
  // ── PDF manipulation ──────────────────────────────────────────────────────
  MERGE_PDF: 'Merge PDF',
  SPLIT_PDF: 'Split PDF',
  REARRANGE_PDF: 'Rearrange PDF',
  DELETE_PDF_PAGES: 'Delete PDF Pages',
  ROTATE_PDF: 'Rotate PDF',
  PDF_RESIZE: 'PDF Resize',
  CROP_PDF: 'Crop PDF',
  PDF_COMPRESS: 'PDF Compress',
  PROTECT_PDF: 'Protect PDF',
  UNLOCK_PDF: 'Unlock PDF (user password)',
  ADD_WATERMARK: 'Add Watermark',
  EDIT_PDF: 'Edit PDF',
  ESIGN_PDF: 'eSign PDF',
  REPLACE_TEXT: 'Replace Text',
  EXTRACT_IMAGES: 'Extract Images from PDF',

  // ── PDF ↔ Office ──────────────────────────────────────────────────────────
  PDF_TO_WORD: 'PDF to Word',
  WORD_TO_PDF: 'Word to PDF',
  PPT_TO_PDF: 'PowerPoint to PDF',
  PDF_TO_PPT: 'PDF to PowerPoint',
  OUTLOOK_TO_PDF: 'MS Outlook to PDF',

  // ── PDF ↔ Ebook ───────────────────────────────────────────────────────────
  EPUB_TO_PDF: 'EPUB to PDF',
  PDF_TO_EPUB: 'PDF to EPUB',
  MOBI_TO_PDF: 'MOBI to PDF',
  PDF_TO_MOBI: 'PDF to MOBI',
  AZW3_TO_PDF: 'AZW3 to PDF',
  PDF_TO_AZW3: 'PDF to AZW3',
  // ── Web tools ──────────────────────────────────────────────────────────────
  URL_TO_PDF: 'URL to PDF',

  // ── PDF ↔ Image ───────────────────────────────────────────────────────────
  JPG_TO_PDF: 'JPG to PDF',
  PNG_TO_PDF: 'PNG to PDF',
  WEBP_TO_PDF: 'WEBP to PDF',
  GIF_TO_PDF: 'GIF to PDF',
  TIFF_TO_PDF: 'TIFF to PDF',
  HEIC_TO_PDF: 'HEIC to PDF',
  EPS_TO_PDF: 'EPS to PDF',
  IMAGES_TO_PDF: 'Images to PDF',
  PDF_TO_IMAGE_JPG: 'PDF to Image (JPG)',
  PDF_TO_IMAGE_PNG: 'PDF to Image (PNG)',
  PDF_TO_IMAGE_TIFF: 'PDF to Image (TIFF)',
  PDF_TO_IMAGE: 'PDF to Image',

  // ── PDF → Data ────────────────────────────────────────────────────────────
  PDF_TO_TEXT: 'PDF to Text',
  PDF_TO_CSV: 'PDF to CSV',
  PDF_TO_EXCEL: 'PDF to Excel',

  // ── Spreadsheet / File tools ──────────────────────────────────────────────
  CSV_TO_EXCEL: 'CSV to Excel',
  EXCEL_TO_CSV: 'Excel to CSV',
  SPLIT_CSV: 'Split CSV',
  SPLIT_EXCEL: 'Split Excel',
  XML_TO_CSV: 'XML to CSV',
  CSV_TO_XML: 'CSV to XML',
  CSV_TO_JSON: 'CSV to JSON',
  EXCEL_TO_XML: 'Excel to XML',
  XML_TO_EXCEL: 'XML to Excel',

  // ── Image tools ───────────────────────────────────────────────────────────
  RESIZE_IMAGE: 'Resize Image',
  IMAGE_TO_TEXT: 'Image to Text',
  COMPRESS_IMAGE: 'Compress Image Size',
  VIEW_METADATA: 'View Metadata',
  ADD_BORDER: 'Add Border to Images',
  SPLIT_IMAGE: 'Image Splitter',
  COLLAGE_MAKER: 'Collage Maker',
  PROFILE_PHOTO_MAKER: 'Profile Photo Maker',
  BlurBackground: 'Blur Background',
  MAKE_ROUND_IMAGE: 'Make Round Image',
  ADD_TEXT_TO_IMAGE: 'Add Text to an Image',
  FLIP_IMAGE: 'Flip Image',
  BLACK_AND_WHITE: 'Black And White',
  TRANSPARENCY_OPTIONS: 'Transparent Background',
  REMOVE_IMAGE_BACKGROUND: 'Remove Image Background',
  PIXELATE_IMAGE: 'Pixelate Image',
  CROP_IMAGE: 'Crop Image',

  // ── Image format conversions ──────────────────────────────────────────────
  WEBP_TO_JPG: 'WebP to JPG',
  PNG_TO_JPG: 'PNG to JPG',
  WEBP_TO_PNG: 'WEBP to PNG',
  JPG_TO_PNG: 'JPG to PNG',
  JPG_TO_WEBP: 'JPG to WEBP',
  TIFF_TO_JPG: 'TIFF to JPG',
  TIFF_TO_PNG: 'TIFF to PNG',
  JPG_TO_AVIF: 'JPG to AVIF',
  PNG_TO_AVIF: 'PNG to AVIF',
  WEBP_TO_AVIF: 'WEBP to AVIF',
  GIF_TO_AVIF: 'GIF to AVIF',
  GIF_TO_JPG: 'GIF to JPG',
  GIF_TO_PNG: 'GIF to PNG',
  JPG_TO_GIF: 'JPG to GIF',
  PNG_TO_GIF: 'PNG to Gif',
  WEBP_TO_GIF: 'WEBP to GIF',
  PNG_TO_EPS: 'PNG to EPS',
  EPS_TO_PNG: 'EPS to PNG',
  EPS_TO_JPG: 'EPS to JPG',
  EPS_TO_SVG: 'EPS to SVG',
  PNG_TO_TIFF: 'PNG to TIFF',
  JPG_TO_TIFF: 'JPG to Tiff',
  FONT_AWESOME_TO_PNG: 'Font Awesome to PNG',

  // ── Text / Utility tools ──────────────────────────────────────────────────
  CASE_CONVERTER: 'Case Converter',
  FIND_AND_REPLACE: 'Find & Replace',
  JSON_FORMATTER: 'JSON Formatter',
  BASE64: 'Base64 Encoder / Decoder',
  XML_TO_JSON: 'XML to JSON',
  JSON_TO_XML: 'JSON to XML',
  WORD_COUNTER: 'Word Counter',

  // ── Video tools ────────────────────────────────────────────────────────────
  TRIM_CUT_VIDEO: 'Trim & Cut Video',
  COMPRESS_VIDEO: 'Compress Video',
  RESIZE_VIDEO: 'Resize Video',
  ADD_SUBTITLES: 'Add subtitles',
  MUTE_VIDEO: 'Mute Video',
  COMPRESS_MOV: 'Compress MOV',
  COMPRESS_AVI: 'Compress AVI',
  COMPRESS_MKV: 'Compress MKV',
  MOV_TO_MP4: 'MOV to MP4',
  VIDEO_TO_WEBP: 'Video to WebP',
  MP4_TO_AVI: 'MP4 to AVI',
  WEBM_TO_MP4: 'WEBM to MP4',
  MKV_TO_MP4: 'MKV to MP4',
  MP4_TO_MOV: 'MP4 to MOV',
  AVI_TO_MP4: 'AVI to MP4',
  MP4_TO_WEBM: 'MP4 to WEBM',
  MOV_TO_AVI: 'MOV to AVI',
  MKV_TO_AVI: 'MKV to AVI',
  WEBM_TO_MOV: 'WEBM to MOV',
  AVI_TO_MOV: 'AVI to MOV',
  MKV_TO_MOV: 'MKV to MOV',
  AVI_TO_MKV: 'AVI to MKV',
  MP4_TO_GIF: 'MP4 to GIF',
  MOV_TO_GIF: 'MOV to GIF',
  GIF_TO_MOV: 'GIF to MOV',
  GIF_TO_WEBM: 'GIF to WEBM',
  MKV_TO_GIF: 'MKV to GIF',
  AVI_TO_GIF: 'AVI to GIF',
  GIF_TO_MP4: 'GIF to MP4',
  GIFF_TO_APNG: 'GIFF to APNG',
  VIDEO_TO_GIF: 'Video to GIF',

  // ── Audio tools ────────────────────────────────────────────────────────────
  EXTRACT_AUDIO: 'Convert Video to Audio',
  MP4_TO_MP3: 'MP4 to MP3',
  MOV_TO_MP3: 'MOV to MP3',
  MKV_TO_MP3: 'MKV to MP3',
  WEBM_TO_MP3: 'WEBM to MP3',
  AVI_TO_MP3: 'AVI to MP3',
  MP4_TO_WAV: 'MP4 to WAV',
  MOV_TO_WAV: 'MOV to WAV',
  MP4_TO_OGG: 'MP4 to OGG',
  M4A_TO_MP3: 'M4A to MP3',
  OGG_TO_MP3: 'OGG to MP3',
  AAC_TO_MP3: 'AAC to MP3',
  M4A_TO_WAV: 'M4A to WAV',
  OGG_TO_WAV: 'OGG to WAV',
  AAC_TO_WAV: 'AAC to WAV',
  AAC_TO_FLAC: 'AAC to FLAC',
  AAC_TO_M4R: 'AAC to M4R',
  M4A_TO_MP4: 'M4A to MP4',
  AAC_TO_MP4: 'AAC to MP4',
};

export const TOOL_REGISTRY = {
  // ── Merge / Split ─────────────────────────────────────────────────────────
  [TOOL_NAMES.MERGE_PDF]: { component: MergePdf },
  [TOOL_NAMES.SPLIT_PDF]: { component: SplitPdf, passToolName: true },

  // ── PDF content editing ──────────────────────────────────────────────────────
  [TOOL_NAMES.ADD_WATERMARK]: { component: WatermarkPdf, passToolName: true },
  [TOOL_NAMES.EDIT_PDF]: { component: EditPdf, passToolName: true },
  [TOOL_NAMES.ESIGN_PDF]: { component: EsignPdf, passToolName: true },
  [TOOL_NAMES.REPLACE_TEXT]: { component: ReplaceTextPdf, passToolName: true },
  [TOOL_NAMES.EXTRACT_IMAGES]: { component: ExtractImagesPdf, passToolName: true },

  // ── Web tools ──────────────────────────────────────────────────────────────
  [TOOL_NAMES.URL_TO_PDF]: { component: UrlToPdf },

  // ── Standalone PDF page tools (formerly PdfToolsPage tabs) ────────────────
  [TOOL_NAMES.REARRANGE_PDF]: { component: PdfRearrangeDelete, passToolName: true },
  [TOOL_NAMES.DELETE_PDF_PAGES]: { component: PdfDelete, passToolName: true },
  [TOOL_NAMES.ROTATE_PDF]: { component: PdfRotate, passToolName: true },
  [TOOL_NAMES.PDF_RESIZE]: { component: PdfResize, passToolName: true },
  [TOOL_NAMES.CROP_PDF]: { component: PdfCrop, passToolName: true },
  [TOOL_NAMES.PDF_COMPRESS]: { component: PdfCompress, passToolName: true },
  [TOOL_NAMES.PROTECT_PDF]: { component: PdfProtect, passToolName: true },
  [TOOL_NAMES.UNLOCK_PDF]: { component: PdfUnlock, passToolName: true },

  // ── PDF ↔ Office ──────────────────────────────────────────────────────────
  [TOOL_NAMES.PDF_TO_WORD]: { component: PdfToWord, passToolName: true },
  [TOOL_NAMES.WORD_TO_PDF]: { component: WordToPdf, passToolName: true },
  [TOOL_NAMES.PPT_TO_PDF]: { component: DocumentConverter, passToolName: true },
  [TOOL_NAMES.PDF_TO_PPT]: { component: DocumentConverter, passToolName: true },
  [TOOL_NAMES.OUTLOOK_TO_PDF]: { component: DocumentConverter, passToolName: true },

  // ── PDF ↔ Ebook ───────────────────────────────────────────────────────────
  [TOOL_NAMES.EPUB_TO_PDF]: { component: DocumentConverter, passToolName: true },
  [TOOL_NAMES.PDF_TO_EPUB]: { component: DocumentConverter, passToolName: true },
  [TOOL_NAMES.MOBI_TO_PDF]: { component: DocumentConverter, passToolName: true },
  [TOOL_NAMES.PDF_TO_MOBI]: { component: DocumentConverter, passToolName: true },
  [TOOL_NAMES.AZW3_TO_PDF]: { component: DocumentConverter, passToolName: true },
  [TOOL_NAMES.PDF_TO_AZW3]: { component: DocumentConverter, passToolName: true },

  // ── PDF ↔ Image ───────────────────────────────────────────────────────────
  [TOOL_NAMES.JPG_TO_PDF]: { component: ImagesToPdf, passToolName: true },
  [TOOL_NAMES.PNG_TO_PDF]: { component: ImagesToPdf, passToolName: true },
  [TOOL_NAMES.WEBP_TO_PDF]: { component: ImagesToPdf, passToolName: true },
  [TOOL_NAMES.GIF_TO_PDF]: { component: ImagesToPdf, passToolName: true },
  [TOOL_NAMES.TIFF_TO_PDF]: { component: ImagesToPdf, passToolName: true },
  [TOOL_NAMES.HEIC_TO_PDF]: { component: ImagesToPdf, passToolName: true },
  [TOOL_NAMES.EPS_TO_PDF]: { component: ImagesToPdf, passToolName: true },
  [TOOL_NAMES.IMAGES_TO_PDF]: { component: ImagesToPdf, passToolName: true },
  [TOOL_NAMES.PDF_TO_IMAGE_JPG]: { component: PdfToImages, props: { defaultFormat: 'jpg' } },
  [TOOL_NAMES.PDF_TO_IMAGE_PNG]: { component: PdfToImages, props: { defaultFormat: 'png' } },
  [TOOL_NAMES.PDF_TO_IMAGE_TIFF]: { component: PdfToImages, props: { defaultFormat: 'tiff' } },
  [TOOL_NAMES.PDF_TO_IMAGE]: { component: PdfToImages },

  // ── PDF → Data ────────────────────────────────────────────────────────────
  [TOOL_NAMES.PDF_TO_TEXT]: { component: PdfToData, passToolName: true },
  [TOOL_NAMES.PDF_TO_CSV]: { component: PdfToData, passToolName: true },
  [TOOL_NAMES.PDF_TO_EXCEL]: { component: PdfToData, passToolName: true },

  // ── Spreadsheet / File tools ──────────────────────────────────────────────
  [TOOL_NAMES.CSV_TO_EXCEL]: { component: SpreadsheetConverter, passToolName: true },
  [TOOL_NAMES.EXCEL_TO_CSV]: { component: SpreadsheetConverter, passToolName: true },
  [TOOL_NAMES.SPLIT_CSV]: { component: FileSplitter, passToolName: true },
  [TOOL_NAMES.SPLIT_EXCEL]: { component: FileSplitter, passToolName: true },
  [TOOL_NAMES.XML_TO_CSV]: { component: XMLToCSV, passToolName: true },
  [TOOL_NAMES.CSV_TO_XML]: { component: CSVToXML },
  [TOOL_NAMES.CSV_TO_JSON]: { component: CSVJSONConverter },
  [TOOL_NAMES.EXCEL_TO_XML]: { component: ExcelToXML },
  [TOOL_NAMES.XML_TO_EXCEL]: { component: XmlToExcel },

  // ── Image tools ───────────────────────────────────────────────────────────
  [TOOL_NAMES.RESIZE_IMAGE]: { component: ImageResizer },
  [TOOL_NAMES.IMAGE_TO_TEXT]: { component: ImageToText },
  [TOOL_NAMES.COMPRESS_IMAGE]: { component: ImageCompressor },
  [TOOL_NAMES.VIEW_METADATA]: { component: ViewMetadata },
  [TOOL_NAMES.COLLAGE_MAKER]: { component: CollageMaker },
  [TOOL_NAMES.ADD_BORDER]: { component: AddBorder },
  [TOOL_NAMES.SPLIT_IMAGE]: { component: ImageSplitter },
  [TOOL_NAMES.PROFILE_PHOTO_MAKER]: { component: ProfilePhotoMaker },
  [TOOL_NAMES.BlurBackground]: { component: BlurBackground },
  [TOOL_NAMES.MAKE_ROUND_IMAGE]: { component: RoundImage },
  [TOOL_NAMES.ADD_TEXT_TO_IMAGE]: { component: AddTextToImage },
  [TOOL_NAMES.FLIP_IMAGE]: { component: FlipImage },
  [TOOL_NAMES.BLACK_AND_WHITE]: { component: BlackAndWhite },
  [TOOL_NAMES.TRANSPARENCY_OPTIONS]: { component: TransparentBackground },
  [TOOL_NAMES.REMOVE_IMAGE_BACKGROUND]: { component: TransparentBackground },
  [TOOL_NAMES.PIXELATE_IMAGE]: { component: PixelateImage },
  [TOOL_NAMES.CROP_IMAGE]: { component: CropImage },

  // ── Image format conversions ──────────────────────────────────────────────
  [TOOL_NAMES.WEBP_TO_JPG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.PNG_TO_JPG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.WEBP_TO_PNG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.JPG_TO_PNG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.JPG_TO_WEBP]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.TIFF_TO_JPG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.TIFF_TO_PNG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.JPG_TO_AVIF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.PNG_TO_AVIF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.WEBP_TO_AVIF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.GIF_TO_AVIF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.GIF_TO_JPG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.GIF_TO_PNG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.JPG_TO_GIF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.PNG_TO_GIF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.WEBP_TO_GIF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.PNG_TO_EPS]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.EPS_TO_PNG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.EPS_TO_JPG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.EPS_TO_SVG]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.PNG_TO_TIFF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.JPG_TO_TIFF]: { component: ImageFormatConverter, passToolName: true },
  [TOOL_NAMES.FONT_AWESOME_TO_PNG]: { component: FontAwesomeToPNG },

  // ── Text / Utility tools ──────────────────────────────────────────────────
  [TOOL_NAMES.CASE_CONVERTER]: { component: CaseConverter, passToolName: true },
  [TOOL_NAMES.FIND_AND_REPLACE]: { component: FindReplace, passToolName: true },
  [TOOL_NAMES.JSON_FORMATTER]: { component: JSONFormatter },
  [TOOL_NAMES.BASE64]: { component: Base64Tool },
  [TOOL_NAMES.XML_TO_JSON]: { component: XMLJSONConverter, props: { initialTool: 'XML to JSON' } },
  [TOOL_NAMES.JSON_TO_XML]: { component: XMLJSONConverter, props: { initialTool: 'JSON to XML' } },
  [TOOL_NAMES.WORD_COUNTER]: { component: WordCounter, passToolName: true },

  // ── Video tools ────────────────────────────────────────────────────────────
  [TOOL_NAMES.TRIM_CUT_VIDEO]: { component: VideoTrimmer, passToolName: true },
  [TOOL_NAMES.COMPRESS_VIDEO]: { component: VideoEditor, passToolName: true },
  [TOOL_NAMES.RESIZE_VIDEO]: { component: VideoResizer, passToolName: true },
  [TOOL_NAMES.ADD_SUBTITLES]: { component: VideoEditor, passToolName: true },
  [TOOL_NAMES.MUTE_VIDEO]: { component: VideoEditor, passToolName: true },
  [TOOL_NAMES.COMPRESS_MOV]: { component: VideoCompressor, passToolName: true },
  [TOOL_NAMES.COMPRESS_AVI]: { component: VideoCompressor, passToolName: true },
  [TOOL_NAMES.COMPRESS_MKV]: { component: VideoCompressor, passToolName: true },
  [TOOL_NAMES.MOV_TO_MP4]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.VIDEO_TO_WEBP]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MP4_TO_AVI]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.WEBM_TO_MP4]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MKV_TO_MP4]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MP4_TO_MOV]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.AVI_TO_MP4]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MP4_TO_WEBM]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MOV_TO_AVI]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MKV_TO_AVI]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.WEBM_TO_MOV]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.AVI_TO_MOV]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MKV_TO_MOV]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.AVI_TO_MKV]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MP4_TO_GIF]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MOV_TO_GIF]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.GIF_TO_MOV]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.GIF_TO_WEBM]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.MKV_TO_GIF]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.AVI_TO_GIF]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.GIF_TO_MP4]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.GIFF_TO_APNG]: { component: VideoFormatConverter, passToolName: true },
  [TOOL_NAMES.VIDEO_TO_GIF]: { component: VideoFormatConverter, passToolName: true },

  // ── Audio tools ────────────────────────────────────────────────────────────
  [TOOL_NAMES.EXTRACT_AUDIO]: { component: AudioExtractor },
  [TOOL_NAMES.MP4_TO_MP3]: { component: VideoToAudioConverter, passToolName: true },
  [TOOL_NAMES.MOV_TO_MP3]: { component: VideoToAudioConverter, passToolName: true },
  [TOOL_NAMES.MKV_TO_MP3]: { component: VideoToAudioConverter, passToolName: true },
  [TOOL_NAMES.WEBM_TO_MP3]: { component: VideoToAudioConverter, passToolName: true },
  [TOOL_NAMES.AVI_TO_MP3]: { component: VideoToAudioConverter, passToolName: true },
  [TOOL_NAMES.MP4_TO_WAV]: { component: VideoToAudioConverter, passToolName: true },
  [TOOL_NAMES.MOV_TO_WAV]: { component: VideoToAudioConverter, passToolName: true },
  [TOOL_NAMES.MP4_TO_OGG]: { component: VideoToAudioConverter, passToolName: true },
  [TOOL_NAMES.M4A_TO_MP3]: { component: AudioFormatConverter, passToolName: true },
  [TOOL_NAMES.OGG_TO_MP3]: { component: AudioFormatConverter, passToolName: true },
  [TOOL_NAMES.AAC_TO_MP3]: { component: AudioFormatConverter, passToolName: true },
  [TOOL_NAMES.M4A_TO_WAV]: { component: AudioFormatConverter, passToolName: true },
  [TOOL_NAMES.OGG_TO_WAV]: { component: AudioFormatConverter, passToolName: true },
  [TOOL_NAMES.AAC_TO_WAV]: { component: AudioFormatConverter, passToolName: true },
  [TOOL_NAMES.AAC_TO_FLAC]: { component: AudioFormatConverter, passToolName: true },
  [TOOL_NAMES.AAC_TO_M4R]: { component: AudioFormatConverter, passToolName: true },
  [TOOL_NAMES.M4A_TO_MP4]: { component: AudioToVideoConverter, passToolName: true },
  [TOOL_NAMES.AAC_TO_MP4]: { component: AudioToVideoConverter, passToolName: true },
};
