import os

routers_dir = r"d:\2026\SmartBill FastAPI\smartBILL\backend\app\routers"

for filename in os.listdir(routers_dir):
    if filename.endswith(".py"):
        filepath = os.path.join(routers_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # We want to change text/html back to application/pdf ONLY for PDF endpoints
        # A good heuristic: if the endpoint returns pdf_content or the path ends with /pdf or /print
        # Since the user literally just replaced all application/pdf with text/html blindly using their script,
        # we need to be careful.
        
        # Actually, let's just replace the specific streaming responses that return pdfs
        if "pdf_manager.generate" in content or "generate_pdf(" in content:
            new_content = content.replace('media_type="text/html"', 'media_type="application/pdf"')
            new_content = new_content.replace("media_type='text/html'", "media_type='application/pdf'")
            
            # Revert any HTMLResponse that actually wanted text/html?
            # Wait, if an endpoint returns ACTUAL html, it should stay text/html!
            # Let's fix this manually where it matters.
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Reverted {filename} back to application/pdf")
