import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { parsePdf } from '../../services/pdfService';
import { normalizeParsedBlocks } from '../../utils/editPdf/parseBlocksUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Loads a PDF via pdf.js, parses text blocks, and renders the current page
 * onto `pdfCanvasRef` with a fit-to-container scale.
 */
export function usePdfDocument({ file, onParsedBlocksChange, containerRef, pdfCanvasRef }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState(842);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [loading, setLoading] = useState(false);
  const [parsedBlocks, setParsedBlocks] = useState({});
  const fileEpoch = useRef(0);

  useEffect(() => {
    if (!file) return undefined;
    const epoch = ++fileEpoch.current;
    let cancelled = false;

    const run = async () => {
      // Defer loading flags so this effect doesn't sync-set during mount (eslint).
      await Promise.resolve();
      if (cancelled || epoch !== fileEpoch.current) return;
      setLoading(true);
      setParsedBlocks({});
      setPageNum(1);

      try {
        const buf = await file.arrayBuffer();
        if (cancelled || epoch !== fileEpoch.current) return;
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled || epoch !== fileEpoch.current) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setPageNum(1);

        try {
          const parsed = await parsePdf(file);
          if (cancelled || epoch !== fileEpoch.current) return;
          const byPage = normalizeParsedBlocks(parsed);
          setParsedBlocks(byPage);
          onParsedBlocksChange?.(byPage);
        } catch (err) {
          console.error('parsePdf:', err);
        }
      } finally {
        if (!cancelled && epoch === fileEpoch.current) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [file, onParsedBlocksChange]);

  useEffect(() => {
    if (!pdfDoc) return undefined;
    let cancelled = false;

    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const vp1 = page.getViewport({ scale: 1 });
      const cw = containerRef.current?.clientWidth ?? 720;
      const fit = Math.min((cw - 64) / vp1.width, 1.6);
      const vp = page.getViewport({ scale: fit });
      const canvas = pdfCanvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = vp.width;
      canvas.height = vp.height;
      setScale(fit);
      setPageHeight(vp1.height);
      setCanvasSize({ w: vp.width, h: vp.height });
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNum, containerRef, pdfCanvasRef]);

  return {
    pageNum,
    setPageNum,
    totalPages,
    scale,
    pageHeight,
    canvasSize,
    loading,
    parsedBlocks,
    setParsedBlocks,
  };
}
