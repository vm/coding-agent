#!/usr/bin/env python3
import sys
import qrcode
from pathlib import Path

def generate_qr(data: str, output_path: str = "qr_code.png", size: int = 10):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=size,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_path)
    print(f"QR code generated: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: generate_qr.py <data> [output_path] [size]")
        sys.exit(1)
    
    data = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "qr_code.png"
    size = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    
    generate_qr(data, output_path, size)
