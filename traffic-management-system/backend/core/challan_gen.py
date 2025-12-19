# core/challan_gen.py
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import os
from datetime import datetime

def generate_challan(violation_data, save_dir="static/challans"):
    """
    Generates a PDF E-Challan.
    violation_data: dict containing {
        'id': str,
        'timestamp': str,
        'vehicle_id': int,
        'speed': float,
        'limit': float,
        'snapshot_path': str
    }
    """
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)

    filename = f"challan_{violation_data['id']}.pdf"
    filepath = os.path.join(save_dir, filename)

    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4

    # Header
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 50, "TRAFFIC VIOLATION E-CHALLAN")
    
    c.setLineWidth(1)
    c.line(50, height - 70, width - 50, height - 70)

    # Details
    c.setFont("Helvetica", 14)
    text_start_y = height - 120
    row_height = 30
    
    details = [
        f"Challan ID: {violation_data['id']}",
        f"Date & Time: {violation_data['timestamp']}",
        f"Vehicle Tracker ID: {violation_data['vehicle_id']}",
        f"Detected Speed: {violation_data['speed']:.2f} km/h",
        f"Speed Limit: {violation_data['limit']} km/h",
        f"Location: Main Highway, Camera 01"
    ]

    for i, line in enumerate(details):
        c.drawString(100, text_start_y - (i * row_height), line)

    # Warning
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.red)
    c.drawString(100, text_start_y - (len(details) * row_height) - 20, "VIOLATION: OVERSPEEDING")
    c.setFillColor(colors.black)

    # Snapshot
    img_path = violation_data.get('snapshot_path')
    if img_path and os.path.exists(img_path):
        # Draw image centered
        img_y = text_start_y - (len(details) * row_height) - 250
        c.drawImage(img_path, 100, img_y, width=400, height=200, preserveAspectRatio=True)
    else:
        c.drawString(100, text_start_y - (len(details) * row_height) - 100, "[Snapshot Not Available]")

    # Footer
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(width / 2, 50, "This is a computer-generated document. No signature required.")

    c.save()
    return filepath
