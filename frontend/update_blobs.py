import os

src_dir = r"d:\2026\SmartBill FastAPI\smartBILL\frontend\src"
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            filepath = os.path.join(root, f)
            with open(filepath, "r", encoding="utf-8") as file:
                content = file.read()
            if 'type: "application/pdf"' in content:
                new_content = content.replace('type: "application/pdf"', 'type: "text/html"')
                with open(filepath, "w", encoding="utf-8") as file:
                    file.write(new_content)
                print(f"Updated {filepath}")
