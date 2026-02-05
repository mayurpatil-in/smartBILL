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
        print("[PDF DEBUG] Initializing PDF Service Browser...")
        try:
            print("[PDF DEBUG] Starting Playwright engine...")
            self._playwright = await async_playwright().start()
            print("[PDF DEBUG] Playwright engine started successfully.")
            
            # Try 1: Microsoft Edge (Optimized for Windows Desktop)
            try:
                print("[PDF DEBUG] Attempting to launch Microsoft Edge (channel='msedge')...")
                self._browser = await self._playwright.chromium.launch(channel="msedge", headless=True)
                print("INFO:    PDF Service: Using Microsoft Edge.")
            except Exception as e_edge:
                print(f"[PDF DEBUG] Edge launch failed: {e_edge}")
                
                # Try 2: Google Chrome
                try:
                    print("[PDF DEBUG] Attempting to launch Google Chrome (channel='chrome')...")
                    self._browser = await self._playwright.chromium.launch(channel="chrome", headless=True)
                    print("INFO:    PDF Service: Using Google Chrome.")
                except Exception as e_chrome:
                    print(f"[PDF DEBUG] Chrome launch failed: {e_chrome}")
                    
                    # Try 3: Bundled/Default (Last Resort, likely to fail in frozen app if not bundled)
                    try:
                        print("[PDF DEBUG] Attempting to launch default/bundled Chromium...")
                        self._browser = await self._playwright.chromium.launch(headless=True)
                        print("INFO:    PDF Service: Using Bundled/Default Chromium.")
                    except Exception as e_bundled:
                        print(f"ERROR:   All browser launch attempts failed. PDF generation will be unavailable.")
                        print(f"ERROR:   Bundled failed: {e_bundled}")
                        self._browser = None
                        
        except Exception as e:
            print(f"CRITICAL PDF SERVICE ERROR: {e}")
            import traceback
            traceback.print_exc()
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

    async def _generate_task(self, html_content: str, options: dict = None) -> bytes:
        """Task running in the worker loop"""
        if not self._browser:
            # Try to init again if it failed previously
            await self._init_browser()
            
        if not self._browser:
             raise Exception("PDF Service Unavailable: No supported browser (Chromium, Edge, Chrome) found.")
            
        context = await self._browser.new_context()
        page = await context.new_page()
        try:
            await page.set_content(html_content)
            
            # Default Options
            pdf_options = {
                "print_background": True,
                "margin": {"top": "20px", "right": "20px", "bottom": "20px", "left": "20px"}
            }
            
            # Use A4 default only if width/height NOT provided in overrides
            # (Because Playwright prioritizes 'format' over 'width'/'height')
            user_has_dimensions = options and ("width" in options or "height" in options)
            if not user_has_dimensions:
                pdf_options["format"] = "A4"
            
            # Merge provided options
            if options:
                pdf_options.update(options)
            
            # print(f"[PDF DEBUG] Final PDF Options passed to Playwright: {pdf_options}")
            
            pdf_data = await page.pdf(**pdf_options)
            return pdf_data
        finally:
            await page.close()
            await context.close()

    async def generate(self, html_content: str, options: dict = None) -> bytes:
        """Public API: Dispatch to worker loop"""
        if not self._loop:
             await self.start()
             
        future = asyncio.run_coroutine_threadsafe(
            self._generate_task(html_content, options), 
            self._loop
        )
        return await asyncio.wrap_future(future)

pdf_manager = PDFManager()

async def generate_pdf(html_content: str, options: dict = None) -> bytes:
    return await pdf_manager.generate(html_content, options)
