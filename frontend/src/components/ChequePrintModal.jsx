import React from "react";
import { Printer, X } from "lucide-react";
import ChequePrint from "./ChequePrint";
import { toast } from "react-hot-toast";

export default function ChequePrintModal({ expense, onClose }) {
  const handlePrint = () => {
    const printContent = document.getElementById("printable-cheque-area");
    if (!printContent) {
      toast.error("Error: Could not find cheque content.");
      return;
    }

    // Create a hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    // Write content to iframe
    const contentWindow = iframe.contentWindow;
    const contentDocument = contentWindow.document;

    // Gather styles from parent to ensure WYSIWYG without CDN
    const styles = Array.from(
      document.querySelectorAll("style, link[rel='stylesheet']")
    )
      .map((node) => node.outerHTML)
      .join("");

    contentDocument.write(`
      <html>
        <head>
          <title>Cheque_${expense?.payee_name || "Draft"}</title>
          ${styles}
          <style>
            @page { size: auto; margin: 0mm; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background-color: white; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            // Print immediately as styles are local
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                // Close after print
                setTimeout(function() {
                   // Verify frameElement exists before removing to prevent errors
                   if (window.frameElement && window.parent && window.parent.document) {
                     window.parent.document.body.removeChild(window.frameElement);
                   }
                }, 1000);
              }, 100);
            }
          </script>
        </body>
      </html>
    `);
    contentDocument.close();

    // Close modal immediately or after print? User preference.
    // Let's keep modal open briefly or close it.
    // onClose();
  };

  if (!expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Printer className="text-purple-600" size={24} />
            Cheque Preview
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-8 bg-gray-200 dark:bg-gray-900 flex justify-center items-center min-h-[300px] overflow-auto">
          {/* Wrapper for shadow (not printed) */}
          <div className="shadow-2xl bg-white">
            {/* The Print Goal - ID Based Selection */}
            <div id="printable-cheque-area">
              <ChequePrint expense={expense} />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-purple-500/30 transform active:scale-95 transition-all"
          >
            <Printer size={20} />
            Print Cheque
          </button>
        </div>
      </div>
    </div>
  );
}
