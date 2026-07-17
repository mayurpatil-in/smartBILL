import os

routers_dir = r"d:\2026\SmartBill FastAPI\smartBILL\backend\app\routers"

for filename in os.listdir(routers_dir):
    if filename.endswith(".py"):
        filepath = os.path.join(routers_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        if "application/pdf" in content:
            new_content = content.replace('media_type="application/pdf"', 'media_type="text/html"')
            new_content = new_content.replace("media_type='application/pdf'", "media_type='text/html'")
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filename}")
