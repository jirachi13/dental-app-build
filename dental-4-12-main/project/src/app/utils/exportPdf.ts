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

// The DOH Consolidated Report is 77 columns wide — scaling that whole width
// onto one landscape page (the naive whole-image approach, kept as the marker
// fallback in placeFullImage below) makes every column ~3.6mm and illegible.
// This variant paginates HORIZONTALLY into column bands:
// it captures the full table once, then for each band draws a page that starts
// with the frozen "Indicator" column and appends only that band's grade
// columns, so each page's columns are big enough to read and no grade is split.
//
// The report table must mark its header cells: the Indicator <th> with
// data-doh="indicator", each grade <th> with data-doh="grade", and the SUMMARY
// <th> with data-doh="summary". Without those markers it falls back to the
// single-image behavior above.
export async function exportDohReportToPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ]);

  const SCALE = 2;
  const canvas = await html2canvas(element, {
    scale: SCALE,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    useCORS: true,
  });

  const pageWidthMm = 297; // A4 landscape
  const pageHeightMm = 210;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const table = element.querySelector('table');
  const indicatorTh = element.querySelector('[data-doh="indicator"]') as HTMLElement | null;
  const gradeThs = Array.from(element.querySelectorAll('[data-doh="grade"]')) as HTMLElement[];
  const summaryTh = element.querySelector('[data-doh="summary"]') as HTMLElement | null;

  // Fallback: markers missing → old whole-width single image.
  if (!table || !indicatorTh || gradeThs.length === 0) {
    placeFullImage(pdf, canvas, pageWidthMm, pageHeightMm);
    pdf.save(filename);
    return;
  }

  const tableLeft = table.getBoundingClientRect().left;
  // Offsets relative to the table's left edge — scroll-invariant because both
  // the cell rect and tableLeft shift together with horizontal scroll.
  const rel = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { left: r.left - tableLeft, right: r.right - tableLeft };
  };
  const indW = indicatorTh.getBoundingClientRect().width; // DOM px
  const grades = gradeThs.map(rel);
  const summary = summaryTh ? rel(summaryTh) : null;

  // Group whole grades into bands capped by rendered width so each band + the
  // Indicator column fits a landscape page legibly. Summary rides with the last
  // band if it fits, else becomes its own band.
  const MAX_BAND_W = 900; // DOM px of data area per band
  const bands: { left: number; right: number }[] = [];
  let i = 0;
  while (i < grades.length) {
    const start = grades[i].left;
    let end = grades[i].right;
    i++;
    while (i < grades.length && grades[i].right - start <= MAX_BAND_W) {
      end = grades[i].right;
      i++;
    }
    bands.push({ left: start, right: end });
  }
  if (summary) {
    const last = bands[bands.length - 1];
    if (summary.right - last.left <= MAX_BAND_W) last.right = summary.right;
    else bands.push({ left: summary.left, right: summary.right });
  }

  let firstPage = true;
  for (const band of bands) {
    // Composite = Indicator strip + this band's strip, side by side, full height.
    const indPx = indW * SCALE;
    const bandLPx = band.left * SCALE;
    const bandWPx = (band.right - band.left) * SCALE;
    const comp = document.createElement('canvas');
    comp.width = Math.round(indPx + bandWPx);
    comp.height = canvas.height;
    const ctx = comp.getContext('2d');
    if (!ctx) continue;
    // Indicator column (canvas x 0..indPx) → left of the page.
    ctx.drawImage(canvas, 0, 0, indPx, comp.height, 0, 0, indPx, comp.height);
    // Band's grade columns → right after the Indicator column.
    ctx.drawImage(canvas, bandLPx, 0, bandWPx, comp.height, indPx, 0, bandWPx, comp.height);

    const imgData = comp.toDataURL('image/png');
    const imgWidthMm = pageWidthMm;
    const imgHeightMm = (comp.height * imgWidthMm) / comp.width;
    let heightLeft = imgHeightMm;
    let position = 0;
    if (!firstPage) pdf.addPage();
    firstPage = false;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidthMm, imgHeightMm);
    heightLeft -= pageHeightMm;
    while (heightLeft > 0) {
      position -= pageHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidthMm, imgHeightMm);
      heightLeft -= pageHeightMm;
    }
  }

  pdf.save(filename);
}

function placeFullImage(
  pdf: { addImage: (...a: unknown[]) => void; addPage: () => void },
  canvas: HTMLCanvasElement,
  pageWidthMm: number,
  pageHeightMm: number,
): void {
  const imgData = canvas.toDataURL('image/png');
  const imgWidthMm = pageWidthMm;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
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
}
