# Client-Side PDF Generation Bypass
# Playwright and WeasyPrint are disabled to prevent crashes on shared hosting environments (like WebHostMost)
# This module now simply returns the raw HTML string encoded as bytes.
# The frontend will render this HTML in a hidden iframe and trigger the native browser print dialog.

class PDFManager:
    """Mock PDFManager for compatibility with existing routes"""
    async def start(self):
        pass
        
    async def stop(self):
        pass

    async def generate(self, html_content: str, options: dict = None) -> bytes:
        return html_content.encode("utf-8")

pdf_manager = PDFManager()

async def generate_pdf(html_content: str, options: dict = None) -> bytes:
    """
    Bypasses server-side PDF generation.
    Returns the raw HTML string as bytes.
    The frontend is responsible for triggering window.print() on this HTML.
    """
    return html_content.encode("utf-8")