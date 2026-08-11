import os
import sys

sys.path.insert(0, os.getcwd())
import pypdfium2 as pdfium
from generate_pdf_note import generate_pdf_study_note

test_content = """📌 1. ප්‍රසුංගල් ආශ්‍රිත රසායනික ක්‍රියාවලිය

ප්‍රසුංගල් යනු ප්‍රධාන වශයෙන් රසායනිකව කැල්සියම් කාබනේට් අඩංගු, හුනුගල් හා හුනුගල් සහිත අවසාදිත පාෂාණ වේ.
ප්‍රසුංගල් ආශ්‍රිත භූ රූප සෑදීමේ ප්‍රධාන ක්‍රියාවලිය වන්නේ ද්‍රවණය සහ කාබනීකරණයයි:

• **වර්ෂාජලය** අහසින් ඇද හැලීමේදී වායුගෝලයේ ඇති කාබන් ඩයොක්සයිඩ් වායුව සමඟ මුසු වී දුර්වල කාබොනික් අම්ලය සෑදේ.
• මෙම අම්ල මිශ්‍ර ජලය හුනුගල් සහිත භූමිය මතින් ගලා යන විට සහ පාෂාණ පැලුම් ඔස්සේ භූගත වන විට, එම ඇති කැල්සියම් කාබනේට් සමඟ රසායනිකව ප්‍රතික්‍රියා කරයි.

📌 2. ප්‍රසුංගල් නිර්මාණය වන ප්‍රධාන ක්‍රම දෙක

පෘථිවිය මත ප්‍රසුංගල් ස්තර ප්‍රධාන ක්‍රම දෙකක් ඔස්සේ නිර්මාණය වේ:
• **රසායනික ක්‍රමය**: සාගර ජලය වාෂ්පීකරණය වීමේදී එහි දියවී පවතින කැල්සියම් කාබනේට් අවක්ෂේප වී සාගර පතුලේ තැන්පත් වීමෙන් සෑදේ.
• **ජෛවීය ක්‍රමය**: සාගර ජලයේ දියවී ඇති කැල්සියම් කාබනේට් අවශෝෂණය කරගෙන තමන්ගේ බාහිර ආරක්ෂිත කටු සෑදූ කොරල් බහුපදවෙසියන් සහ බෙල්ලන් මියගිය පසුව තැන්පත් වී සෑදේ."""

out_pdf = "scratch/test_margin_fix.pdf"
res = generate_pdf_study_note("ප්‍රසුංගල් ආශ්‍රිත භූ රූප", test_content, out_pdf, subject_code="geo")

if res and os.path.exists(out_pdf):
    pdf = pdfium.PdfDocument(out_pdf)
    print(f"Generated PDF with {len(pdf)} pages successfully.")
    page = pdf[0]
    image = page.render(scale=2).to_pil()
    image.save("scratch/test_margin_fix_page1.png")
    print("Saved preview to scratch/test_margin_fix_page1.png")
else:
    print("PDF generation failed.")
