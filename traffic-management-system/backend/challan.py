import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
import qrcode
import datetime
from utils.config import PROJECT_ROOT

# output directory
CHALLAN_DIR = os.path.join(PROJECT_ROOT, "challans")

def generate_qr_code(data):
    """Generates a QR code image as a temporary file."""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill="black", back_color="white")
    
    # Save to a temp path
    temp_path = os.path.join(CHALLAN_DIR, "temp_qr.png")
    img.save(temp_path)
    return temp_path

def generate_challan(violation_data):
    """
    Generates a PDF E-Challan.
    violation_data: dict {
        'id': str (vehicle_id),
        'timestamp': datetime object or str,
        'speed': float,
        'limit': int,
        'lane': str,
        'snapshot_path': str (absolute path)
    }
    """
    if not os.path.exists(CHALLAN_DIR):
        os.makedirs(CHALLAN_DIR)

    # Generate filename
    v_id = violation_data['id']
    ts_str = violation_data['timestamp'].replace(":", "").replace(" ", "_")
    filename = f"Challan_{v_id}_{ts_str}.pdf"
    filepath = os.path.join(CHALLAN_DIR, filename)

    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4

    # 1. Header Area
    c.setFillColor(colors.darkblue)
    c.rect(0, height - 100, width, 100, fill=1, stroke=0)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 50, "TRAFFIC POLICE E-CHALLAN")
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 70, "OFFICIAL NOTICE OF TRAFFIC VIOLATION")

    # 2. Violation Info Box
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 16)
    v_type = violation_data.get('violation_type', 'Traffic Violation') # Default
    c.drawString(50, height - 140, f"VIOLATION DETAILS: {v_type.upper()}")
    
    c.setLineWidth(1)
    c.line(50, height - 145, 250, height - 145)

    c.setFont("Helvetica", 12)
    y_pos = height - 170
    line_height = 25
    
    # Data to display
    plate_display = violation_data.get('plate', f"ID-{violation_data['id']}")
    info = [
        f"Challan Number: {v_id}-{ts_str}",
        f"Violation Type: {violation_data.get('violation_type', 'Overspeeding')}",
        f"Vehicle Number: {plate_display}",
        f"Date & Time: {violation_data['timestamp']}",
        f"Vehicle ID: {violation_data['id']}",
        f"Detected Speed: {violation_data['speed']:.2f} km/h",
        f"Speed Limit: {violation_data['limit']} km/h",
        f"Lane: {violation_data['lane']}",
        f"Location: Main Highway, Camera 04",
        f"Fine Amount: $100.00"
    ]
    
    for item in info:
        c.drawString(50, y_pos, item)
        y_pos -= line_height

    # 3. Snapshot Image
    snapshot_path = violation_data.get('snapshot_path')
    if snapshot_path and os.path.exists(snapshot_path):
        c.setFont("Helvetica-Bold", 16)
        c.drawString(350, height - 140, "VEHICLE SNAPSHOT")
        c.line(350, height - 145, 550, height - 145)
        
        try:
            # Resize image setup could be more complex, ReportLab handles scaling via width/height args
            c.drawImage(snapshot_path, 350, height - 400, width=200, height=150, preserveAspectRatio=True)
        except Exception as e:
            print(f"Error drawing image: {e}")
            c.drawString(350, height - 200, "Image Error")

    # 4. QR Code (Payment Link demo)
    qr_data = f"PAY: {v_id} | AMT: 100 | {ts_str}"
    qr_path = generate_qr_code(qr_data)
    
    c.drawImage(qr_path, 50, 150, width=100, height=100)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 140, "Scan to Pay")
    
    # 5. Footer
    c.setFont("Helvetica-Oblique", 10)
    c.setFillColor(colors.dimgrey)
    c.drawCentredString(width / 2, 50, "This is a computer-generated document. No signature required.")
    
    c.save()
    
    # Cleanup temp QR
    if os.path.exists(qr_path):
        os.remove(qr_path)
        
    print(f"[CHALLAN GENERATED] {filepath}")
    return filepath
