import { useState, useEffect, useRef } from "react";
import { X, Printer, ExternalLink, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  title = "Document Preview",
  fileName = "document.pdf",
}) {
  const [ready, setReady] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen && pdfUrl) {
      // Fetch the blob URL to get the HTML text
      fetch(pdfUrl)
        .then((res) => res.text())
        .then((text) => {
          setHtmlContent(text);
          setTimeout(() => setReady(true), 100);
        })
        .catch((err) => {
          console.error("Failed to load HTML:", err);
          setReady(true);
        });
    } else {
      setReady(false);
      setHtmlContent("");
    }
  }, [isOpen, pdfUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (e) {
        console.error("Print failed", e);
        toast.error("Failed to print document.");
      }
    }
  };

  const handleDownload = () => {
    toast.success("Please select 'Save as PDF' in the Print Dialog", { duration: 5000 });
    handlePrint();
  };

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
              <p className="text-xs text-blue-100 mt-0.5">HTML Preview & Print</p>
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
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-2 sm:p-8 flex justify-center">
          {ready ? (
            <div className="w-full h-full bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                title={title}
                className="w-full h-full border-none bg-white"
                sandbox="allow-same-origin allow-scripts allow-modals"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 animate-pulse">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Loading Document...
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col sm:flex-row items-center justify-end gap-3 shadow-inner">
          <button
            onClick={() => {
              const link = document.createElement("a");
              link.href = pdfUrl;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition flex items-center gap-2"
            title="Open in New Tab"
          >
            <ExternalLink size={18} />
            Open in New Tab
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2"
          >
            <Download size={18} />
            Download PDF
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <Printer size={18} />
            Print
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
