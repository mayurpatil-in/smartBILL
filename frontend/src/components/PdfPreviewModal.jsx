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
  import.meta.url,
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

  const [isImage, setIsImage] = useState(false);

  // Reset page on new file
  useEffect(() => {
    setPageNumber(1);
    setScale(1.0);
    // Simple extension check
    if (pdfUrl) {
      const lower = pdfUrl.toLowerCase();
      setIsImage(
        lower.endsWith(".jpg") ||
          lower.endsWith(".jpeg") ||
          lower.endsWith(".png") ||
          lower.endsWith(".webp"),
      );
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-scale-in border border-gray-200 dark:border-gray-700">
        {/* Header with Gradient */}
        <div className="relative flex items-center justify-between px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <Printer className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-xs text-blue-100 mt-0.5">Preview & Download</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
            title="Close Preview"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div
          ref={containerRef}
          className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-8 overflow-y-auto flex justify-center"
        >
          {ready &&
            (pdfUrl ? (
              isImage ? (
                <div className="flex items-center justify-center min-h-full">
                  <img
                    src={pdfUrl}
                    alt="Preview"
                    style={{
                      transform: `scale(${scale})`,
                      transition: "transform 0.2s",
                    }}
                    className="max-w-full shadow-2xl rounded-lg"
                  />
                </div>
              ) : (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex flex-col items-center justify-center gap-4 py-20">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium animate-pulse">
                        Loading PDF...
                      </p>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-red-500">
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                        <X size={32} />
                      </div>
                      <p className="font-semibold">Failed to load PDF</p>
                      <p className="text-sm text-gray-500">
                        Please try again or download the file
                      </p>
                    </div>
                  }
                  className="shadow-2xl"
                >
                  <Page
                    pageNumber={pageNumber}
                    width={
                      (containerWidth ? Math.min(containerWidth, 850) : 650) *
                      scale
                    }
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="rounded-2xl overflow-hidden bg-white shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
                  />
                </Document>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 animate-pulse">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Printer className="text-blue-500" size={28} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Generating Preview...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    This may take a moment
                  </p>
                </div>
              </div>
            ))}
        </div>

        {/* Enhanced Footer with Controls */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          {/* Pagination Controls - Hide for Images */}
          <div
            className={`flex items-center gap-3 text-sm order-2 sm:order-1 ${
              isImage ? "invisible" : ""
            }`}
          >
            <button
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              title="Previous Page"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Page{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {pageNumber}
                </span>{" "}
                of {numPages || "--"}
              </span>
            </div>
            <button
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => p + 1)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              title="Next Page"
            >
              <ChevronRight size={18} />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-xl shadow-sm">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                title="Zoom Out"
              >
                <Minus size={16} />
              </button>
              <span className="w-14 text-center font-semibold text-gray-700 dark:text-gray-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                title="Zoom In"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                const toastId = toast.loading("Preparing print...");

                // Remove existing print iframe if any
                const existingIframe = document.getElementById("print-iframe");
                if (existingIframe) document.body.removeChild(existingIframe);

                const iframe = document.createElement("iframe");
                iframe.id = "print-iframe";
                iframe.style.position = "fixed";
                iframe.style.left = "-10000px";
                iframe.style.top = "0";
                iframe.style.width = "1000px";
                iframe.style.height = "1000px";
                iframe.src = pdfUrl;

                document.body.appendChild(iframe);

                iframe.onload = () => {
                  toast.success("Printing...", { id: toastId });
                  setTimeout(() => {
                    try {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    } catch (e) {
                      console.error(e);
                      toast.error("Print failed. Try downloading.");
                    }
                  }, 500);
                };
              }}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition flex items-center gap-2"
            >
              <Printer size={18} />
              Print
            </button>
            <button
              onClick={() => {
                // Open PDF in external viewer (system default)
                const link = document.createElement("a");
                link.href = pdfUrl;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Opening in external viewer...");
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2"
              title="Open in system PDF viewer (Adobe, Edge, etc.)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Open Externally
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
