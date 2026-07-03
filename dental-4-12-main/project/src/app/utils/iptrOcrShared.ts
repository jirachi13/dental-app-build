// Lightweight pieces of the OCR module that the UI needs at render time.
// Kept separate from iptrOcr.ts so importing them does NOT pull tesseract.js
// and pdfjs-dist (~1.5MB) into the main bundle — the heavy module is
// dynamic-imported only when someone actually scans a form.

// Confidence below this threshold gets flagged in the UI for manual review.
// Never trusted silently — see CLAUDE.md OCR MODULE spec.
export const OCR_CONFIDENCE_THRESHOLD = 70;

export type IptrOcrFieldKey =
  | 'firstName' | 'lastName' | 'middleName' | 'birthdate' | 'age' | 'gender'
  | 'address' | 'contactNumber' | 'grade' | 'section';

export interface IptrOcrResult {
  fields: Partial<Record<IptrOcrFieldKey, string>>;
  confidences: Partial<Record<IptrOcrFieldKey, number>>;
  rawText: string;
  overallConfidence: number;
}
