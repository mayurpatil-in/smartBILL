from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
import qrcode
import os


def generate_invoice_pdf(invoice, company, party, file_path):
    c = canvas.Canvas(file_path, pagesize=A4)
    width, height = A4

    x_margin = 20 * mm
    y = height - 20 * mm

    # =========================
    # LOGO (TOP LEFT)
    # =========================
    logo_path = "app/assets/logo.png"
    if os.path.exists(logo_path):
        c.drawImage(
            ImageReader(logo_path),
            x_margin,
            y - 40,
            width=50,
            height=40,
            preserveAspectRatio=True
        )

    # =========================
    # COMPANY DETAILS
    # =========================
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x_margin + 60, y, company.name)

    c.setFont("Helvetica", 10)
    y -= 15
    c.drawString(x_margin + 60, y, f"Address: {company.address or '-'}")
    y -= 12
    c.drawString(x_margin + 60, y, f"GSTIN: {getattr(company, 'gstin', '-')}")
    y -= 25

    # =========================
    # QR CODE (TOP RIGHT)
    # =========================
    qr_data = (
        f"Invoice:{invoice.id}\n"
        f"Amount:{invoice.grand_total}\n"
        f"Company:{company.name}"
    )

    qr_img = qrcode.make(qr_data)
    qr_path = "app/assets/qr.png"
    qr_img.save(qr_path)

    c.drawImage(
        qr_path,
        width - 70 * mm,
        height - 70 * mm,
        width=40 * mm,
        height=40 * mm
    )

    # =========================
    # INVOICE META BOX
    # =========================
    c.rect(width - 90 * mm, y - 10, 70 * mm, 40 * mm)

    c.setFont("Helvetica", 9)
    c.drawString(width - 85 * mm, y + 15, f"Invoice No: {invoice.id}")
    c.drawString(width - 85 * mm, y, f"Date: {invoice.invoice_date}")
    fy = invoice.financial_year
    fy_text = f"{fy.start_date.year}-{fy.end_date.year}"

    c.drawString(width - 85 * mm, y - 15, f"FY: {fy_text}")


    y -= 60

    # =========================
    # PARTY DETAILS
    # =========================
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x_margin, y, "Bill To")

    c.setFont("Helvetica", 10)
    y -= 14
    c.drawString(x_margin, y, party.name)
    y -= 12
    c.drawString(x_margin, y, f"Phone: {party.phone or '-'}")

    y -= 20

    # =========================
    # ITEMS TABLE HEADER
    # =========================
    c.setFillColor(colors.lightgrey)
    c.rect(x_margin, y, width - 2 * x_margin, 18, fill=1)
    c.setFillColor(colors.black)

    c.setFont("Helvetica-Bold", 10)
    c.drawString(x_margin + 5, y + 5, "Item")
    c.drawString(x_margin + 250, y + 5, "Qty")
    c.drawString(x_margin + 300, y + 5, "Rate")
    c.drawString(x_margin + 360, y + 5, "Amount")

    y -= 20
    c.setFont("Helvetica", 10)

    # =========================
    # ITEMS ROWS
    # =========================
    for item in invoice.items:
        c.drawString(x_margin + 5, y + 4, item.item.name)
        c.drawRightString(x_margin + 285, y + 4, str(item.quantity))
        c.drawRightString(x_margin + 335, y + 4, f"{item.rate:.2f}")
        c.drawRightString(x_margin + 420, y + 4, f"{item.amount:.2f}")
        y -= 16

    c.line(x_margin, y, width - x_margin, y)
    y -= 20

    # =========================
    # TOTALS
    # =========================
    gst_half = invoice.gst_amount / 2

    c.drawRightString(420, y, f"Subtotal: {invoice.subtotal:.2f}")
    y -= 14
    c.drawRightString(420, y, f"CGST (9%): {gst_half:.2f}")
    y -= 14
    c.drawRightString(420, y, f"SGST (9%): {gst_half:.2f}")
    y -= 16

    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(420, y, f"Grand Total: {invoice.grand_total:.2f}")

    y -= 35

    # =========================
    # FOOTER
    # =========================
    c.setFont("Helvetica", 9)
    c.drawString(x_margin, y, "Authorized Signatory")
    c.drawRightString(width - x_margin, y, f"For {company.name}")

    c.showPage()
    c.save()
