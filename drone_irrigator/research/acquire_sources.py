"""Explicit source acquisition; failed reads remain failures, never alternate editions.

Run with the bundled artifact Python (pypdfium2). Downloads are research cache until
the reviewed originals are deliberately catalogued. No runtime registry writes.
"""
from concurrent.futures import ThreadPoolExecutor
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "tmp" / "drone-irrigator-research"
SOURCES = {
    "IRR-001": ("Groasis - Growboxx Biodegradable Reservoir Datasheet - undated", "https://www.groasis.com/images/downloads/Datasheets/en/4%20Datasheet%20Groasis%20Growboxx%20plant%20cocoon%20-%20English.pdf"),
    "IRR-002": ("Groasis - Waterboxx Reusable Reservoir Datasheet - Version 2", "https://www.groasis.com/images/downloads/Datasheets/en/3_Datasheet_Reusable_Groasis_Waterboxx_plant_cocoon_-_English.pdf"),
    "IRR-003": ("LIFE NIEBLAS - Technical Manual - 2025", "https://lifenieblas.com/sites/default/files/documentacion/2025/LIFE%20NIEBLAS-Technical%20Manual_2025_w.pdf"),
    "IRR-004": ("Carabassa et al - Water Saving Techniques for Restoring Desertified Lands - 2022", "https://onlinelibrary.wiley.com/doi/pdf/10.1002/ldr.4134"),
    "IRR-005": ("MENAQUA - Cocoon Field Trial Final Report - Jordan", "https://menaquafoundation.org/wp-content/uploads/2022/03/Final-Report.pdf"),
    "IRR-006": ("CIHEAM - NUCIS Newsletter 14 - 2007", "https://networks.iamz.ciheam.org/nuts/pdfs/NUCIS%2014_2007.pdf"),
    "IRR-007": ("Groasis - Retail Quantity Discount Price List - 2017-07-01", "https://www.groasis.com/images/Distributor_documents/20170701_pricelist/20170701_Groasis_Retail_Pricelist_-_End_user_Quantity_Discount_2017.pdf"),
    "IRR-008": ("LIFE NIEBLAS - D3 Reforestation Execution and Results Monitoring", "https://lifenieblas.com/sites/default/files/documentacion/2025/Monitoring%2520and%2520evaluation%2520of%2520the%2520reforestation%2520execution%2520and%2520results.pdf"),
    "IRR-009": ("LIFE Green Link - C2 Planting Replication Records", "https://thegreenlink.eu/wp-content/uploads/2021/02/Annex-3-C2-Del-Replication-with-pics.pdf"),
    "DRONE-001": ("DJI - Matrice 350 RTK User Manual - Version 1.2", "https://dl.djicdn.com/downloads/matrice_350_rtk/20250806UM/Matrice_350_RTK_User_Manual_v1.2_en4.pdf"),
    "DRONE-002": ("DJI - Dock 4 and Matrice 5TD User Manual - Version 1.0 - 2026-10", "https://terra-1-g.djicdn.com/6189933d30024fc1b331bffe4fe41837/dock-4/20261014/UM/renew/DJI_DOCK_4_MATRICE_5TD_UM_EN_20261016_final.pdf"),
    "DRONE-003": ("DJI - Agras T50 and T25 Flight Manual - Version 1.0 - 2025-01", "https://dl.djicdn.com/downloads/t50_t25/20250109/T50_T25_User_Manual_v1.0_EN.pdf"),
    "DRONE-004": ("Miwa et al - Wire Supplied Drone Citrus Watering Experiment - 2024", "https://medcraveonline.com/IRATJ/IRATJ-10-00280.pdf"),
    "POLICY-003": ("EASA - Open Category Conditions - FAQ 116450", "https://www.easa.europa.eu/en/print/pdf/node/116450/215572"),
}


def acquire(item, review_existing=False):
    ident, (title, url) = item
    target = CACHE / (ident + ".pdf")
    row = {"id": ident, "title": title, "url": url, "checked_on": "2026-11-04"}
    try:
        if review_existing:
            content = target.read_bytes()
            row["retrieval"] = "Explicit --review-existing: inspect original bytes retained by the interrupted download/extraction run. No network request."
        else:
            with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=75) as response:
                content = response.read()
                row.update(final_url=response.url, content_type=response.headers.get_content_type())
        if not content.startswith(b"%PDF-"):
            raise ValueError("Intended source did not return PDF bytes")
        target.write_bytes(content)
        row.update(status="downloaded", bytes=len(content), sha256=hashlib.sha256(content).hexdigest())
    except Exception as exc:
        row.update(status="failed", error=f"{type(exc).__name__}: {exc}")
    return row


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--review-existing", action="store_true")
    parser.add_argument("--only", nargs="+", choices=list(SOURCES))
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=5) as pool:
        selected = SOURCES.items() if args.only is None else [(k, SOURCES[k]) for k in args.only]
        results = list(pool.map(lambda item: acquire(item, args.review_existing), selected))
    # PDFium is deliberately used sequentially; its library is not thread-safe.
    for row in results:
        if row["status"] == "failed":
            continue  # Recorded failure; final exit remains unsuccessful.
        with pdfium.PdfDocument(CACHE / (row["id"] + ".pdf")) as pdf:
            row["pages"] = len(pdf)
            pages = []
            for i in range(len(pdf)):
                page = pdf[i]
                textpage = page.get_textpage()
                try:
                    pages.append(f"--- PDF PAGE {i+1} ---\n{textpage.get_text_range()}")
                finally:
                    textpage.close()
                    page.close()
        (CACHE / (row["id"] + ".txt")).write_text("\n\n".join(pages), encoding="utf-8")
    ledger_path = Path(__file__).with_name("acquisition.json")
    previous = json.loads(ledger_path.read_text(encoding="utf-8")) if ledger_path.exists() else []
    ledger_path.write_text(json.dumps(previous + results, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(results, indent=2))
    raise SystemExit(1 if any(r["status"] == "failed" for r in results) else 0)
