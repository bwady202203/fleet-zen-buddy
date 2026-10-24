# Make custody request print match preview

## Cause
The print style forces every element inside the form to `display: block !important`, which breaks all side-by-side rows (company header, date/number/hijri row, "المحترم" line, amount box, signatures) — so the printed page looks scattered while the preview is fine.

## Fix (src/components/CustodyRequestPrint.tsx, print function only)
- Hide the app with `body > *:not(#custody-request-print-document) { display: none !important; }` and stop overriding the display of the form's own elements, so flex layouts print exactly like the preview.
- Position the document at top-left, width 210mm / height 297mm, `page: custody-request`, margin 0, `print-color-adjust: exact` so blue backgrounds print.
- Wait for fonts (`document.fonts.ready`) and two animation frames before `window.print()`, so Cairo font and layout are settled.
- Keep the same component used in the preview — no design changes.

## Verify
Render print media via Playwright, screenshot, and confirm it matches the preview within one A4 page.
