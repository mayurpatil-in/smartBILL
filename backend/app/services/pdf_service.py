import asyncio
import sys
import threading
from playwright.async_api import async_playwright, Browser, Playwright

class PDFManager:
    def __init__(self):
        self._loop: asyncio.AbstractEventLoop = None
        self._thread: threading.Thread = None
        self._playwright: Playwright = None
        self._browser: Browser = None

    def _run_event_loop(self):
        """Runs properly configured event loop in a separate thread"""
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()

    async def _init_browser(self):
        """Initialize browser inside the worker loop"""
        try:
            self._playwright = await async_playwright().start()
            
            # Try 1: Bundled/Default
            try:
                print("INFO:    Attempting to launch default/bundled Chromium...")
                self._browser = await self._playwright.chromium.launch(headless=True)
                print("INFO:    PDF Service: Using Bundled/Default Chromium.")
            except Exception as e_bundled:
                print(f"WARN:    Default browser failed: {e_bundled}")
                
                # Try 2: Microsoft Edge
                try:
                    print("INFO:    Attempting to launch Microsoft Edge...")
                    self._browser = await self._playwright.chromium.launch(channel="msedge", headless=True)
                    print("INFO:    PDF Service: Using Microsoft Edge.")
                except Exception as e_edge:
                    print(f"WARN:    Edge failed: {e_edge}")
                    
                    # Try 3: Google Chrome
                    try:
                        print("INFO:    Attempting to launch Google Chrome...")
                        self._browser = await self._playwright.chromium.launch(channel="chrome", headless=True)
                        print("INFO:    PDF Service: Using Google Chrome.")
                    except Exception as e_chrome:
                        print(f"ERROR:   All browser launch attempts failed. PDF generation will be unavailable.")
                        print(f"ERROR:   Chrome failed: {e_chrome}")
                        self._browser = None
                        
        except Exception as e:
            print(f"CRITICAL PDF SERVICE ERROR: {e}")
            self._browser = None

    async def start(self):
        """Start the worker thread and browser"""
        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self._thread.start()
        
        # Wait for loop to be created
        while self._loop is None:
            await asyncio.sleep(0.01)

        # Initialize browser in that loop
        # We wrap this to ensure it doesn't crash the main startup
        try:
            future = asyncio.run_coroutine_threadsafe(self._init_browser(), self._loop)
            await asyncio.wrap_future(future)
        except Exception as e:
            print(f"ERROR: Failed to initialize PDF Service: {e}")
            # Do NOT re-raise, allow app to start without PDF

    async def _stop_browser(self):
        try:
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            pass # Ignore errors during shutdown (common with Playwright on reload)
        
    async def stop(self):
        """Stop the browser and the thread"""
        if not self._loop:
            return

        # Close browser
        if self._loop.is_running():
            future = asyncio.run_coroutine_threadsafe(self._stop_browser(), self._loop)
            await asyncio.wrap_future(future)
            
            # Stop loop
            self._loop.call_soon_threadsafe(self._loop.stop)
        
        if self._thread:
            self._thread.join(timeout=5.0)
            
        self._loop = None
        self._thread = None
        print("INFO:    PDF Service stopped.")

    async def _generate_task(self, html_content: str) -> bytes:
        """Task running in the worker loop"""
        if not self._browser:
            # Try to init again if it failed previously (maybe user installed browser?)
            await self._init_browser()
            
        if not self._browser:
             raise Exception("PDF Service Unavailable: No supported browser (Chromium, Edge, Chrome) found.")
            
        context = await self._browser.new_context()
        page = await context.new_page()
        try:
            await page.set_content(html_content)
            pdf_data = await page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "20px", "right": "20px", "bottom": "20px", "left": "20px"}
            )
            return pdf_data
        finally:
            await page.close()
            await context.close()

    async def generate(self, html_content: str) -> bytes:
        """Public API: Dispatch to worker loop"""
        if not self._loop:
             await self.start()
             
        future = asyncio.run_coroutine_threadsafe(
            self._generate_task(html_content), 
            self._loop
        )
        return await asyncio.wrap_future(future)

pdf_manager = PDFManager()

async def generate_pdf(html_content: str) -> bytes:
    return await pdf_manager.generate(html_content)
