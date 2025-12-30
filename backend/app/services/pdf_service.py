from playwright.async_api import async_playwright
import asyncio
import sys

async def _generate_pdf_task(html_content: str) -> bytes:
    """
    Internal task to generate PDF using Playwright
    """
    async with async_playwright() as p:
        # Launch browser in headless mode
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Set content
        await page.set_content(html_content)
        
        # Generate PDF
        # Format A4, with background graphics (for styling)
        pdf_data = await page.pdf(
            format="A4",
            print_background=True,
            margin={
                "top": "20px",
                "right": "20px",
                "bottom": "20px",
                "left": "20px"
            }
        )
        
        await browser.close()
        return pdf_data

def _run_in_proactor(html_content: str) -> bytes:
    """
    Run the async task in a new event loop with Proactor policy (Windows fix)
    """
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    return asyncio.run(_generate_pdf_task(html_content))

async def generate_pdf(html_content: str) -> bytes:
    """
    Public interface that runs the PDF generation in a separate thread
    to avoid event loop conflicts on Windows.
    """
    return await asyncio.to_thread(_run_in_proactor, html_content)
