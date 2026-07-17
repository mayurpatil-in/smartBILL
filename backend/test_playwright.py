import asyncio
from playwright.async_api import async_playwright

async def run_test():
    print("Starting Playwright...")
    try:
        async with async_playwright() as p:
            print("Launching Chromium...")
            browser = await p.chromium.launch(headless=True)
            print("Chromium launched successfully!")
            
            print("Creating new page...")
            page = await browser.new_page()
            
            print("Generating PDF...")
            await page.set_content("<h1>Playwright is working!</h1>")
            pdf_bytes = await page.pdf()
            
            print(f"✅ SUCCESS! PDF generated. Size: {len(pdf_bytes)} bytes")
            await browser.close()
    except Exception as e:
        print(f"\n❌ FAILED to run Playwright. Error:\n{e}")

if __name__ == "__main__":
    asyncio.run(run_test())
