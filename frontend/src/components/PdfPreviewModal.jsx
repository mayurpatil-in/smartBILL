import { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import toast from "react-hot-toast";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker locally
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  title = "Document Preview",
  fileName = "document.pdf",
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef(null);

  // Reset page on new file
  useEffect(() => {
    setPageNumber(1);
    setScale(1.0);
  }, [pdfUrl]);

  // Adjust width on resize
  useEffect(() => {
    if (!isOpen) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 48); // minus padding
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isOpen]);

  // Delay rendering to allow container measurement
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (isOpen) setTimeout(() => setReady(true), 100);
    else setReady(false);
  }, [isOpen]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Printer className="text-blue-600" size={24} />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div
          ref={containerRef}
          className="flex-1 bg-gray-100 dark:bg-gray-900 p-6 overflow-y-auto flex justify-center"
        >
          {ready &&
            (pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="text-gray-500 animate-pulse">
                    Loading PDF...
                  </div>
                }
                error={<div className="text-red-500">Failed to load PDF.</div>}
                className="shadow-lg"
              >
                <Page
                  pageNumber={pageNumber}
                  width={
                    (containerWidth ? Math.min(containerWidth, 800) : 600) *
                    scale
                  }
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="rounded-lg overflow-hidden bg-white"
                />
              </Document>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 animate-pulse">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p>Generating PDF...</p>
              </div>
            ))}
        </div>

        {/* Pagination & Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Pagination */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 order-2 sm:order-1">
            <button
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span>
              Page {pageNumber} of {numPages || "--"}
            </span>
            <button
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => p + 1)}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-2" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Zoom Out"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Zoom In"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                const toastId = toast.loading("Preparing print...");
                const iframe = document.createElement("iframe");
                // Position off-screen but keep dimensions to ensure rendering
                iframe.style.position = "fixed";
                iframe.style.left = "-10000px";
                iframe.style.top = "0";
                iframe.style.width = "1000px";
                iframe.style.height = "1000px";
                iframe.style.border = "0";
                iframe.src = pdfUrl;
                document.body.appendChild(iframe);

                iframe.onload = () => {
                  // PDF Viewer needs time to initialize
                  setTimeout(() => {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    toast.dismiss(toastId);

                    // Cleanup
                    setTimeout(() => {
                      if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                      }
                    }, 60000);
                  }, 2000); // 2 second delay for rendering
                };
              }}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition flex items-center gap-2"
            >
              <Printer size={18} />
              Print
            </button>
            <a
              href={pdfUrl}
              download={fileName}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition flex items-center gap-2"
            >
              <Download size={18} />
              Download
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
