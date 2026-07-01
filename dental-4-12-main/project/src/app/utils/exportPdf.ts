import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Renders a DOM element (including content wider than the viewport, e.g. a
// wide report table with horizontal scroll) to a PDF, splitting across
// multiple pages if the content is taller than one page.
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2, // higher-res output than a 1:1 screenshot
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
