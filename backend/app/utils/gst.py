def calculate_gst(subtotal: float, gst_percent: float = 18):
    gst_amount = subtotal * gst_percent / 100
    grand_total = subtotal + gst_amount
    return gst_amount, grand_total
