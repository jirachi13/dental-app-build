// jsPDF + html2canvas-pro are dynamically imported (not top-level) so they
// land in their own chunk, loaded only when someone actually clicks
// "Download PDF" — not bundled into every page's initial load. These two
// libraries alone pushed the main bundle over Workbox's 2MB precache limit
// when imported at the top level.
//
// html2canvas-pro, not html2canvas — this app's Tailwind v4 colors are
// defined via the oklch() CSS function, which the original html2canvas
// can't parse ("Attempting to parse an unsupported color function").
// html2canvas-pro is a maintained fork with oklch/lab/lch support.

// Renders a DOM element (including content wider than the viewport, e.g. a
// wide report table with horizontal scroll) to a PDF, splitting across
// multiple pages if the content is taller than one page.
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2, // higher-res output than a 1:1 screenshot
    // width/height (not just windowWidth/windowHeight) are required to
    // actually capture beyond the element's on-screen, viewport-constrained
    // size — windowWidth/windowHeight alone only affect the simulated
    // layout viewport, not how much of the element itself gets captured.
    // Without these, columns beyond the visible width were still cropped.
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pageWidthMm = 297; // A4 landscape — this report is wide, portrait would need more page splits
  const pageHeightMm = 210;
  const imgWidthMm = pageWidthMm;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let heightLeft = imgHeightMm;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidthMm, imgHeightMm);
  heightLeft -= pageHeightMm;

  while (heightLeft > 0) {
    position -= pageHeightMm;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidthMm, imgHeightMm);
    heightLeft -= pageHeightMm;
  }

  pdf.save(filename);
}
