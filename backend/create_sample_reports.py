"""
Script to create sample PDF reports for testing
"""
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from datetime import datetime
import os

def create_sample_report(filename, donor_name, donor_id, blood_group, status="Eligible"):
    """Create a sample eligibility report PDF"""
    
    filepath = f"/app/backend/uploads/reports/{filename}"
    
    c = canvas.Canvas(filepath, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 20)
    c.drawString(inch, height - inch, "OrganConnect - Eligibility Report")
    
    # Line separator
    c.line(inch, height - 1.3*inch, width - inch, height - 1.3*inch)
    
    # Report details
    c.setFont("Helvetica", 12)
    y = height - 2*inch
    
    c.drawString(inch, y, f"Report Date: {datetime.now().strftime('%B %d, %Y')}")
    y -= 0.3*inch
    c.drawString(inch, y, f"Donor Name: {donor_name}")
    y -= 0.3*inch
    c.drawString(inch, y, f"Donor ID: {donor_id}")
    y -= 0.3*inch
    c.drawString(inch, y, f"Blood Group: {blood_group}")
    y -= 0.5*inch
    
    # Eligibility status
    c.setFont("Helvetica-Bold", 14)
    c.drawString(inch, y, "Eligibility Status:")
    
    if status == "Eligible":
        c.setFillColorRGB(0, 0.5, 0)  # Green
    else:
        c.setFillColorRGB(0.8, 0, 0)  # Red
    
    c.setFont("Helvetica-Bold", 16)
    y -= 0.4*inch
    c.drawString(inch + 0.5*inch, y, status.upper())
    
    c.setFillColorRGB(0, 0, 0)  # Reset to black
    y -= 0.6*inch
    
    # Medical Assessment
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, y, "Medical Assessment Summary:")
    c.setFont("Helvetica", 11)
    
    y -= 0.3*inch
    c.drawString(inch + 0.3*inch, y, "✓ Blood tests: Normal")
    y -= 0.25*inch
    c.drawString(inch + 0.3*inch, y, "✓ Cardiovascular screening: Passed")
    y -= 0.25*inch
    c.drawString(inch + 0.3*inch, y, "✓ Infectious disease screening: Negative")
    y -= 0.25*inch
    c.drawString(inch + 0.3*inch, y, "✓ Organ function tests: Within normal range")
    y -= 0.25*inch
    c.drawString(inch + 0.3*inch, y, "✓ Physical examination: Satisfactory")
    
    y -= 0.5*inch
    
    # Recommendations
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, y, "Recommendations:")
    c.setFont("Helvetica", 11)
    
    y -= 0.3*inch
    if status == "Eligible":
        c.drawString(inch + 0.3*inch, y, "• Donor is medically fit for organ donation")
        y -= 0.25*inch
        c.drawString(inch + 0.3*inch, y, "• Continue with registration process")
        y -= 0.25*inch
        c.drawString(inch + 0.3*inch, y, "• Annual health checkups recommended")
    else:
        c.drawString(inch + 0.3*inch, y, "• Donor currently not eligible due to medical reasons")
        y -= 0.25*inch
        c.drawString(inch + 0.3*inch, y, "• May reapply after 6 months")
        y -= 0.25*inch
        c.drawString(inch + 0.3*inch, y, "• Consult with personal physician")
    
    # Footer
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(inch, 0.75*inch, "This is a computer-generated document. No signature required.")
    c.drawString(inch, 0.5*inch, f"OrganConnect Medical Services | Report ID: {donor_id[:12]} | Confidential")
    
    c.save()
    print(f"Created report: {filepath}")

# Create sample reports for all active donors in mock data
donors = [
    ("donor_1_eligibility_report.pdf", "John Donor", "donor-id-001", "O+"),
    ("donor_2_eligibility_report.pdf", "Sarah Wilson", "donor-id-002", "A+"),
    ("donor_3_eligibility_report.pdf", "Michael Chen", "donor-id-003", "B+"),
    ("donor_4_eligibility_report.pdf", "Emma Johnson", "donor-id-004", "AB+"),
    ("donor_5_eligibility_report.pdf", "David Patel", "donor-id-005", "O-"),
    ("donor_6_eligibility_report.pdf", "Jessica Brown", "donor-id-006", "A-"),
    ("donor_7_eligibility_report.pdf", "Robert Garcia", "donor-id-007", "B-"),
]

if __name__ == "__main__":
    print("Creating sample eligibility reports...")
    for filename, name, donor_id, blood_group in donors:
        create_sample_report(filename, name, donor_id, blood_group, "Eligible")
    print("All sample reports created successfully!")
