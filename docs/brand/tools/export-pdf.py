"""Export the kit with an existing Chromium binary; no download or install."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

BRAND = Path(__file__).resolve().parents[1]
# CHROME is an explicit executable path. T3's installed browser avoids snap confinement.
candidates = [os.environ.get("CHROME")]
candidates += [str(p) for p in (Path.home() / ".t3/tools/chrome-headless-shell").glob("linux64/*/chrome-headless-shell")]
candidates += [shutil.which("chromium"), shutil.which("google-chrome")]
chrome = next((p for p in candidates if p and Path(p).is_file()), None)
if not chrome:
    raise SystemExit("No existing Chromium binary found. Set CHROME or use browser Print to PDF.")
exports = {"brand-guide": 6, "quick-reference": 1, "templates/slide-template": 1,
           "templates/social-card-template": 1, "templates/document-template": 1}
(BRAND / "dist").mkdir(exist_ok=True)
for name, expected in exports.items():
    output = BRAND / "dist" / (name.split("/")[-1] + ".pdf")
    with tempfile.TemporaryDirectory(prefix="brand-pdf-") as profile:
        subprocess.run([chrome, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                        "--timeout=10000", "--user-data-dir=" + profile,
                        "--print-to-pdf=" + str(output), (BRAND / (name + ".html")).as_uri()],
                       check=True, capture_output=True, timeout=40)
    if shutil.which("pdfinfo"):
        info = subprocess.check_output(["pdfinfo", str(output)], text=True)
        count = int(next(line.split(":", 1)[1] for line in info.splitlines() if line.startswith("Pages:")))
        assert count == expected, f"{name}: {count} pages, expected {expected}"
    if shutil.which("pdftotext"):
        text = subprocess.check_output(["pdftotext", str(output), "-"], text=True)
        assert "Wiresharks" in text, f"{name}: missing text"
        assert "Proposed template with neutral example copy" not in text, f"{name}: print-only content leaked"
    print(f"PASS {output.name}: {expected} page(s)")
