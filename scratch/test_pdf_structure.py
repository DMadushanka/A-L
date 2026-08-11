import os
import sys
from pathlib import Path

sys.path.insert(0, os.getcwd())
import pypdfium2 as pdfium
from generate_pdf_note import generate_pdf_study_note

test_content = """📌 (අ) කඳු / නිම්න ග්ලැසියර් බාදන භූ රූප:

• **සර්ක / කොරි / ක්වේම් (Cirque / Corrie / Cwm)**: ග්ලැසියර් බාදනයට ලක් වූ කඳු බැවුම්වල දැකිය හැකි, හාන්සි පුටුවක හැඩය ගත් ආවට හෝ ද්‍රෝණි හැඩැති නිම්න වේ [07_Geography_Notes_Tute.pdf, p. 47].
• **අරේට / ඇති බෙදුම / අසිපත් වැටිය (Arête)**: සර්ක දෙකක් එකිනෙකට පිටුපසින් හෝ ආසන්නව පිහිටා තිබීමේදී, ඒවා ක්‍රමයෙන් විශාල වී මැදින් ඉතිරි වන තියුණු ධාරයක් සහිත කඳු වැටි ලක්ෂණයකි [07_Geography_Notes_Tute.pdf, p. 49]. (උදා: ඇල්ප්ස් කඳු බැවුම්) [07_Geography_Notes_Tute.pdf, p. 49].
• **පිරමිඩාකාර මුදුන් (Pyramidal Peaks / Horn)**: කඳු මුදුනක සෑම පැත්තකින්ම ග්ලැසියර ගලා යමින් කඳු බැවුම් බාදනය කරන විට, කන්ද වටා සර්ක සහ අරේට නිර්මාණය වේ. එහිදී කඳු මුදුනේ ඇති ප්‍රතිරෝධී පාෂාණ කොටසක් පමණක් ඉතිරි වී උල් පිරමිඩාකාර හැඩයක් ගනී [07_Geography_Notes_Tute.pdf, p. 49]. (උදා: ස්විට්සර්ලන්තයේ මැටර්හෝන් කන්ද) [07_Geography_Notes_Tute.pdf, p. 49].
• **U හැඩැති නිම්න (U-Shaped Valleys)**: කඳු බැවුමක පිහිටි පූර්ව 'V' හැඩැති ගංගා නිම්නයක් ඔස්සේ ග්ලැසියර ගමන් කිරීමේදී, එහි පතුල මෙන්ම දෙපස ඉවුරු ද දැඩි බාදනයට ලක් වේ. එහි ප්‍රතිඵලයක් ලෙස නිම්නය පළලින් හා ගැඹුරින් වැඩි වී U හැඩයක් ගනී [07_Geography_Notes_Tute.pdf, p. 50, 51].
• **ලම්භ නිම්න / එල්ලෙන නිම්න (Hanging Valleys)**: ප්‍රධාන ග්ලැසියර නිම්නයට වඩා ශාඛා ග්ලැසියර නිම්නවල බාදනය සහ ගැඹුර අඩුය [07_Geography_Notes_Tute.pdf, p. 50, 51]. (උදා: කැලිෆෝනියාවේ යොසෙමිටි නිම්නය) [07_Geography_Notes_Tute.pdf, p. 51]."""

out_pdf = "scratch/test_geo_clean.pdf"
res = generate_pdf_study_note("ග්ලැසියර් බාදන භූ රූප", test_content, out_pdf, subject_code="geo")

if res and os.path.exists(out_pdf):
    pdf = pdfium.PdfDocument(out_pdf)
    print(f"Generated PDF with {len(pdf)} pages successfully.")
    page = pdf[0]
    image = page.render(scale=2).to_pil()
    image.save("scratch/test_geo_clean_page1.png")
    print("Saved preview to scratch/test_geo_clean_page1.png")
else:
    print("PDF generation failed.")
