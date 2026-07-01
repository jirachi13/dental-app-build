import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// Confidence below this threshold gets flagged in the UI for manual review.
// Never trusted silently — see CLAUDE.md OCR MODULE spec.
export const OCR_CONFIDENCE_THRESHOLD = 70;

// Tesseract.js can only read raster images, so every page of a PDF (front
// and back of the paper form both matter) is rendered to a canvas first.
async function rasterizePdfPages(file: File): Promise<HTMLCanvasElement[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const canvases: HTMLCanvasElement[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 }); // upscale for better OCR accuracy
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create canvas context');
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    canvases.push(canvas);
  }
  return canvases;
}

export type IptrOcrFieldKey =
  | 'firstName' | 'lastName' | 'middleName' | 'birthdate' | 'age' | 'gender'
  | 'address' | 'contactNumber' | 'grade' | 'section';

export interface IptrOcrResult {
  fields: Partial<Record<IptrOcrFieldKey, string>>;
  confidences: Partial<Record<IptrOcrFieldKey, number>>;
  rawText: string;
  overallConfidence: number;
}

const GRADES = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];

// Every label that can appear on the form, used as a stop-boundary so one
// field's capture doesn't swallow the next field's label — paper forms
// commonly print several fields on one line, e.g. "Name: ____ Sex: ____".
const ALL_FIELD_LABELS = [
  "student'?s name", 'pangalan', 'name',
  'birth\\s*date', 'birthday', 'date of birth',
  'age', 'sex', 'gender', 'address', 'occupation',
  'contact\\s*(no\\.?|number|#)', 'mobile\\s*(no\\.?|number|#)',
  'grade\\s*(level)?', 'section',
];

// A value that's just an unfilled placeholder (underscores, slashes, "mm/dd/yyyy") — treat as blank.
function isPlaceholder(value: string): boolean {
  const stripped = value.replace(/[_\-\/\s]/g, '');
  if (!stripped) return true;
  return /^(mm|dd|yyyy)+$/i.test(stripped);
}

function findLabelValue(text: string, labels: string[]): string | null {
  const boundary = ALL_FIELD_LABELS.join('|');
  for (const label of labels) {
    const re = new RegExp(`(?:${label})\\s*[:\\-]?\\s*([\\s\\S]*?)(?=(?:${boundary})\\s*[:\\-]|[\\r\\n]|$)`, 'i');
    const match = text.match(re);
    if (match?.[1]) {
      const value = match[1].trim().replace(/\s{2,}/g, ' ');
      if (value && !isPlaceholder(value)) return value;
    }
  }
  return null;
}

function confidenceForValue(value: string, words: Tesseract.Word[]): number | undefined {
  if (!value) return undefined;
  const tokens = value.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.filter((w) => tokens.includes(w.text.toLowerCase().replace(/[^a-z0-9]/g, '')));
  if (matches.length === 0) return undefined;
  return matches.reduce((sum, w) => sum + w.confidence, 0) / matches.length;
}

function normalizeGrade(raw: string): string {
  const digitMatch = raw.match(/\d+/);
  if (digitMatch) {
    const n = Number(digitMatch[0]);
    if (n >= 1 && n <= 10) return `Grade ${n}`;
  }
  if (/kinder/i.test(raw)) return 'Kinder';
  const found = GRADES.find((g) => raw.toLowerCase().includes(g.toLowerCase()));
  return found ?? raw.trim();
}

function normalizeSex(raw: string): string {
  if (/^m(ale)?$/i.test(raw.trim())) return 'Male';
  if (/^f(emale)?$/i.test(raw.trim())) return 'Female';
  return raw.trim();
}

function normalizeBirthdate(raw: string): string {
  // Handles MM/DD/YYYY, M-D-YYYY, and YYYY-MM-DD; returns YYYY-MM-DD for <input type="date">.
  const iso = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const mdy = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  return '';
}

function splitName(raw: string): { firstName: string; middleName: string; lastName: string } {
  // DOH IPTR forms typically print "Last Name, First Name Middle Name".
  if (raw.includes(',')) {
    const [last, rest = ''] = raw.split(',').map((s) => s.trim());
    const [first, ...mid] = rest.split(/\s+/).filter(Boolean);
    return { firstName: first ?? '', middleName: mid.join(' '), lastName: last ?? '' };
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] };
}

function extractFieldsFromPage(
  text: string,
  words: Tesseract.Word[],
  fields: Partial<Record<IptrOcrFieldKey, string>>,
  confidences: Partial<Record<IptrOcrFieldKey, number>>,
) {
  // Only fills fields the previous page(s) didn't find — earlier pages win.
  const setField = (key: IptrOcrFieldKey, rawValue: string | null, normalize?: (v: string) => string) => {
    if (fields[key] || !rawValue) return;
    const value = normalize ? normalize(rawValue) : rawValue;
    if (!value) return;
    fields[key] = value;
    const conf = confidenceForValue(rawValue, words);
    if (conf !== undefined) confidences[key] = Math.round(conf);
  };

  const nameRaw = findLabelValue(text, ['name', "student'?s name", 'pangalan']);
  if (nameRaw && !fields.firstName && !fields.lastName) {
    const { firstName, middleName, lastName } = splitName(nameRaw);
    setField('firstName', firstName);
    setField('middleName', middleName);
    setField('lastName', lastName);
    // Split fields inherit the whole-name-line confidence since OCR reports it per word, not per split.
    const conf = confidenceForValue(nameRaw, words);
    if (conf !== undefined) {
      if (fields.firstName) confidences.firstName = Math.round(conf);
      if (fields.middleName) confidences.middleName = Math.round(conf);
      if (fields.lastName) confidences.lastName = Math.round(conf);
    }
  }

  setField('birthdate', findLabelValue(text, ['birth\\s*date', 'birthday', 'date of birth']), normalizeBirthdate);
  setField('age', findLabelValue(text, ['age']));
  setField('gender', findLabelValue(text, ['sex', 'gender']), normalizeSex);
  setField('address', findLabelValue(text, ['address']));
  setField('contactNumber', findLabelValue(text, ['contact\\s*(no\\.?|number|#)', 'mobile\\s*(no\\.?|number|#)']));
  setField('grade', findLabelValue(text, ['grade\\s*(level)?']), normalizeGrade);
  setField('section', findLabelValue(text, ['section']));
}

export async function extractIptrFields(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<IptrOcrResult> {
  const images: Tesseract.ImageLike[] = file.type === 'application/pdf'
    ? await rasterizePdfPages(file)
    : [file];

  let pageIndex = 0;

  const worker = await Tesseract.createWorker('eng', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        // Split progress evenly across pages so multi-page PDFs still show smooth 0-100%.
        onProgress(Math.round((pageIndex + m.progress) / images.length * 100));
      }
    },
  });

  const fields: Partial<Record<IptrOcrFieldKey, string>> = {};
  const confidences: Partial<Record<IptrOcrFieldKey, number>> = {};
  const rawTextParts: string[] = [];
  const allWords: Tesseract.Word[] = [];

  try {
    for (; pageIndex < images.length; pageIndex++) {
      const { data } = await worker.recognize(images[pageIndex], {}, { blocks: true });
      const words: Tesseract.Word[] = (data.blocks ?? []).flatMap((b) =>
        b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)),
      );
      allWords.push(...words);
      rawTextParts.push(data.text);
      extractFieldsFromPage(data.text, words, fields, confidences);
    }
  } finally {
    await worker.terminate();
  }

  const overallConfidence = allWords.length
    ? Math.round(allWords.reduce((sum, w) => sum + w.confidence, 0) / allWords.length)
    : 0;

  return { fields, confidences, rawText: rawTextParts.join('\n\n--- page break ---\n\n'), overallConfidence };
}
