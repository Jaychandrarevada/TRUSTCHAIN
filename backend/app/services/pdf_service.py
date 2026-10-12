"""
PDF generation service for TrustChain.
Generates high-fidelity university degree certificates (e.g. Osmania University)
with embedded security metadata, QR codes, official seals, and student photos.
"""
from __future__ import annotations

import io
import json
import qrcode
from PIL import Image as PILImage
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter


def generate_certificate_pdf(
    cert_uid: str,
    institution_name: str,
    student_name: str,
    program: str,
    subject_data: dict,
    content_hash: str,
    verify_url: str,
    tampered: bool = False,
    tamper_modifications: dict | None = None,
) -> bytes:
    """
    Renders an official University Degree Certificate as PDF bytes.
    If `tampered` is True, injects modified details (e.g. changed CGPA or name)
    so that re-hashing will trigger cryptographic TAMPERED state.
    """
    displayed_data = dict(subject_data)
    if tampered and tamper_modifications:
        displayed_data.update(tamper_modifications)

    packet = io.BytesIO()
    # Landscape orientation for authentic university degree look (11 x 8.5 inches)
    c = canvas.Canvas(packet, pagesize=landscape(letter))
    width, height = landscape(letter)

    # 1. Ornamental Double Border (Burgundy & Gold)
    burgundy = colors.HexColor("#6b1426")
    gold = colors.HexColor("#c59b27")
    navy = colors.HexColor("#0f2942")
    light_gold = colors.HexColor("#fdf9ee")

    # Background tint
    c.setFillColor(light_gold)
    c.rect(0, 0, width, height, fill=True, stroke=False)

    # Outer border
    c.setStrokeColor(burgundy)
    c.setLineWidth(5)
    c.rect(20, 20, width - 40, height - 40)

    # Inner decorative border
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.rect(26, 26, width - 52, height - 52)

    # Corner decorative squares
    for x, y in [(26, 26), (width - 36, 26), (26, height - 36), (width - 36, height - 36)]:
        c.setFillColor(burgundy)
        c.rect(x - 5, y - 5, 20, 20, fill=True, stroke=False)
        c.setFillColor(gold)
        c.circle(x + 5, y + 5, 4, fill=True, stroke=False)

    # 2. Watermark in background
    c.saveState()
    c.setFont("Helvetica-Bold", 60)
    c.setFillColor(colors.HexColor("#e8e0cc"))
    c.translate(width / 2, height / 2 - 20)
    c.rotate(35)
    c.drawCentredString(0, 0, "OSMANIA UNIVERSITY")
    c.restoreState()

    # 3. University Emblem / Crest (Vector Drawn)
    emblem_x = width / 2
    emblem_y = height - 80

    # Outer circle
    c.setStrokeColor(burgundy)
    c.setFillColor(colors.white)
    c.circle(emblem_x, emblem_y, 32, fill=True, stroke=True)
    c.setStrokeColor(gold)
    c.setLineWidth(1.5)
    c.circle(emblem_x, emblem_y, 28, fill=False, stroke=True)

    # Inner emblem design
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(burgundy)
    c.drawCentredString(emblem_x, emblem_y - 6, "OU")

    c.setFont("Helvetica", 5.5)
    c.setFillColor(navy)
    c.drawCentredString(emblem_x, emblem_y + 14, "ESTD 1918")
    c.drawCentredString(emblem_x, emblem_y - 20, "HYDERABAD")

    # 4. Header Typography
    c.setFont("Times-Bold", 24)
    c.setFillColor(burgundy)
    c.drawCentredString(width / 2, height - 130, institution_name.upper())

    c.setFont("Times-Roman", 10)
    c.setFillColor(colors.HexColor("#555555"))
    c.drawCentredString(width / 2, height - 146, "HYDERABAD, TELANGANA, INDIA — ACCREDITED WITH 'A+' GRADE BY NAAC")
    c.drawCentredString(width / 2, height - 159, "FACULTY OF ENGINEERING & TECHNOLOGY")

    # Thin dividing rule
    c.setStrokeColor(gold)
    c.setLineWidth(1)
    c.line(width / 2 - 180, height - 168, width / 2 + 180, height - 168)

    # 5. Degree Title
    c.setFont("Times-Italic", 12)
    c.setFillColor(colors.HexColor("#333333"))
    c.drawCentredString(width / 2, height - 192, "This is to certify that")

    # Candidate Name
    c.setFont("Times-Bold", 19)
    c.setFillColor(navy)
    c.drawCentredString(width / 2, height - 216, displayed_data.get("holder_name", student_name).upper())

    # Hall Ticket No / Registration Details
    hall_ticket = displayed_data.get("hall_ticket_no", "1005-21-733-042")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#444444"))
    c.drawCentredString(width / 2, height - 233, f"Hall Ticket No: {hall_ticket}")

    # Degree conferral text
    c.setFont("Times-Roman", 12)
    c.setFillColor(colors.HexColor("#222222"))
    c.drawCentredString(width / 2, height - 260, "having completed all prescribed academic requirements and passed the examinations")
    c.drawCentredString(width / 2, height - 276, "held in MAY 2024 has been admitted to the degree of")

    # Program / Branch
    c.setFont("Times-Bold", 15)
    c.setFillColor(burgundy)
    c.drawCentredString(width / 2, height - 302, displayed_data.get("program", program).upper())

    # Division / CGPA
    cgpa = displayed_data.get("cgpa", "8.85")
    division = displayed_data.get("division", "First Class with Distinction")
    c.setFont("Times-Bold", 12)
    c.setFillColor(navy)
    c.drawCentredString(width / 2, height - 325, f"Division: {division}   |   CGPA: {cgpa} / 10.0")

    # 6. Student Passport Photo Box (Left Side)
    photo_x = 55
    photo_y = height - 265
    photo_w = 85
    photo_h = 105

    c.setStrokeColor(burgundy)
    c.setLineWidth(1.5)
    c.setFillColor(colors.HexColor("#f0ede6"))
    c.rect(photo_x, photo_y, photo_w, photo_h, fill=True, stroke=True)

    # Stylized Avatar silhouette or photo representation
    avatar_cx = photo_x + photo_w / 2
    c.setFillColor(colors.HexColor("#8a9ba8"))
    c.circle(avatar_cx, photo_y + 60, 20, fill=True, stroke=False)
    c.beginPath()
    c.arc(avatar_cx - 28, photo_y + 10, avatar_cx + 28, photo_y + 60)
    c.setFillColor(colors.HexColor("#5b6f80"))
    c.circle(avatar_cx, photo_y + 20, 24, fill=True, stroke=False)

    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.white)
    c.drawCentredString(avatar_cx, photo_y + 6, "STUDENT PHOTO")

    # Photo boundary watermark
    c.setFont("Helvetica", 6)
    c.setFillColor(colors.HexColor("#888888"))
    c.drawCentredString(avatar_cx, photo_y - 12, "DIGITALLY ATTESTED")

    # 7. Official University Stamp (Embossed Red Vector Stamp - Right Side)
    seal_x = width - 110
    seal_y = height - 220
    seal_r = 38

    c.setStrokeColor(colors.HexColor("#b31b1b"))
    c.setLineWidth(2)
    c.setFillColor(colors.HexColor("#fff5f5"))
    c.circle(seal_x, seal_y, seal_r, fill=True, stroke=True)

    c.setStrokeColor(colors.HexColor("#b31b1b"))
    c.setLineWidth(1)
    c.circle(seal_x, seal_y, seal_r - 4, fill=False, stroke=True)

    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(colors.HexColor("#b31b1b"))
    c.drawCentredString(seal_x, seal_y + 16, "★ OSMANIA UNIVERSITY ★")
    c.drawCentredString(seal_x, seal_y + 4, "OFFICIAL SEAL")
    c.drawCentredString(seal_x, seal_y - 8, "REGISTRAR OFFICE")
    c.drawCentredString(seal_x, seal_y - 18, "HYDERABAD")

    # 8. Signatures Section
    sig_y = 110
    c.setStrokeColor(colors.HexColor("#444444"))
    c.setLineWidth(1)

    # Signature line 1
    c.line(90, sig_y, 230, sig_y)
    c.setFont("Times-Italic", 12)
    c.setFillColor(navy)
    c.drawCentredString(160, sig_y + 8, "Prof. P. Laxminarayana")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#666666"))
    c.drawCentredString(160, sig_y - 12, "Dean, Faculty of Engineering")

    # Signature line 2
    c.line(width - 230, sig_y, width - 90, sig_y)
    c.setFont("Times-Italic", 12)
    c.setFillColor(navy)
    c.drawCentredString(width - 160, sig_y + 8, "Dr. K. Ravinder")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#666666"))
    c.drawCentredString(width - 160, sig_y - 12, "Registrar & Controller of Exams")

    # 9. TrustChain Blockchain Security Bar & QR Code (Bottom)
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_bytes = io.BytesIO()
    qr_img.save(qr_bytes, format="PNG")
    qr_bytes.seek(0)

    # Draw QR code in center bottom
    qr_x = width / 2 - 25
    qr_y = 48
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(qr_bytes), qr_x, qr_y, width=50, height=50)

    # Security Footnotes
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(navy)
    c.drawCentredString(width / 2, 40, f"Certificate UID: {cert_uid}")

    c.setFont("Courier", 6.5)
    c.setFillColor(colors.HexColor("#666666"))
    display_hash = content_hash[:18] + "..." + content_hash[-14:] if len(content_hash) > 32 else content_hash
    c.drawCentredString(width / 2, 30, f"Blockchain Seal (SHA-256): {display_hash}")

    if tampered:
        # Watermark showing FORGED/TAMPERED for demonstration purposes
        c.saveState()
        c.setFont("Helvetica-Bold", 42)
        c.setFillColor(colors.HexColor("#e53935"), alpha=0.35)
        c.translate(width / 2, height / 2)
        c.rotate(15)
        c.drawCentredString(0, 0, "[ TAMPERED COPY FOR TESTING ]")
        c.restoreState()

    c.save()
    packet.seek(0)

    # 10. Embed machine-readable metadata in PDF
    reader = PdfReader(packet)
    writer = PdfWriter()
    writer.append(reader)

    # The payload embedded in the PDF - exact copy of subject_data (or with tamper modifications)
    embedded_payload = dict(subject_data)
    if tampered and tamper_modifications:
        embedded_payload.update(tamper_modifications)

    metadata = {
        "/Title": f"Degree Certificate - {displayed_data.get('holder_name', student_name)}",
        "/Author": institution_name,
        "/Subject": f"TrustChain Blockchain Attestation {cert_uid}",
        "/Keywords": f"TrustChain,UID:{cert_uid},Blockchain,Verified",
        "/TrustChain_CertUID": cert_uid,
        "/TrustChain_Payload": json.dumps(embedded_payload, sort_keys=True),
        "/TrustChain_IsTampered": "true" if tampered else "false",
    }
    writer.add_metadata(metadata)

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output.getvalue()


def extract_certificate_from_pdf(pdf_bytes: bytes) -> tuple[str | None, dict | None, dict]:
    """
    Extracts the certificate UID and presented payload from an uploaded PDF.
    Returns: (cert_uid, presented_payload, debug_metadata)
    """
    import re
    reader = PdfReader(io.BytesIO(pdf_bytes))
    meta = reader.metadata or {}
    debug_info = {"pages": len(reader.pages)}

    # 1. Check custom metadata first
    cert_uid = None
    payload = None

    for k, v in meta.items():
        key_str = str(k).lower()
        if "certuid" in key_str:
            cert_uid = str(v).strip()
        elif "payload" in key_str:
            try:
                payload = json.loads(str(v))
            except Exception:
                pass

    # 2. Extract text across pages if cert_uid or payload missing
    all_text = ""
    for page in reader.pages:
        all_text += (page.extract_text() or "") + "\n"

    debug_info["text_sample"] = all_text[:200]

    if not cert_uid:
        match = re.search(r"TC-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}", all_text)
        if match:
            cert_uid = match.group(0).upper()

    # If payload not in metadata, check if we can reconstruct from text or if tampered mark exists
    if payload is None and cert_uid:
        # Check for CGPA or other key fields in text
        cgpa_match = re.search(r"CGPA:\s*([0-9.]+)", all_text)
        name_match = re.search(r"certify that\s+([A-Z\s.]+)\s+Hall Ticket", all_text, re.IGNORECASE)
        payload = {
            "holder_name": name_match.group(1).strip() if name_match else "Extracted Student",
            "cgpa": cgpa_match.group(1).strip() if cgpa_match else None,
        }

    return cert_uid, payload, debug_info

