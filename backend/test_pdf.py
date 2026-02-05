import asyncio
import sys
from app.services.pdf_service import generate_pdf, pdf_manager

# Force Windows Proactor
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

async def main():
    print("Starting PDF Test...")
    try:
        await pdf_manager.start()
        print("PDF Manager started.")
        
        html = "<html><body><h1>Test</h1></body></html>"
        
        # Test 1: A4
        print("Testing A4 generation...")
        pdf_a4 = await generate_pdf(html, {"format": "A4"})
        print(f"A4 PDF generated, size: {len(pdf_a4)} bytes")

        # Test 2: Thermal
        print("Testing Thermal generation...")
        options = {
            "width": "50mm",
            "height": "25mm",
            "print_background": True,
            "margin": {"top": "0", "right": "0", "bottom": "0", "left": "0"}
        }
        pdf_thermal = await generate_pdf(html, options)
        print(f"Thermal PDF generated, size: {len(pdf_thermal)} bytes")
        
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await pdf_manager.stop()
        print("Test Complete.")

if __name__ == "__main__":
    asyncio.run(main())
