import os
import subprocess

def export_html_to_pdf():
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    ]
    browser = None
    for p in edge_paths:
        if os.path.exists(p):
            browser = p
            break
            
    if not browser:
        print("No Edge/Chrome browser found!")
        return False
        
    html_abs = os.path.abspath("THUYET_MINH_SAN_PHAM.html")
    pdf_abs = os.path.abspath("THUYET_MINH_SAN_PHAM.pdf")
    
    file_url = "file:///" + html_abs.replace("\\", "/")
    
    cmd = [
        browser,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_abs}",
        file_url
    ]
    
    print(f"Exporting using {browser}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(pdf_abs) and os.path.getsize(pdf_abs) > 0:
        print(f"SUCCESS: Created PDF at {pdf_abs} ({os.path.getsize(pdf_abs)} bytes)")
        return True
    else:
        print("Failed to generate PDF:", res.stdout, res.stderr)
        return False

if __name__ == "__main__":
    export_html_to_pdf()
