import os
import sys

# Force passenger env
os.environ["SERVER_ENV"] = "passenger"

try:
    from weasyprint import HTML
    print("WeasyPrint loaded successfully!")
    pdf_bytes = HTML(string="<h1>Test PDF</h1>").write_pdf()
    print(f"PDF generated successfully! Size: {len(pdf_bytes)} bytes")
except Exception as e:
    print(f"WeasyPrint failed: {e}")
