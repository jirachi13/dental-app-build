import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { CameraCapture } from './CameraCapture';
import { parseSpreadsheetRecords, normalizeSex, normalizeGrade } from '../utils/studentImport';
import { BLANK_NEW_PATIENT, type NewPatientForm } from './PatientList';
import type { IptrOcrFieldKey } from '../utils/iptrOcrShared';

// Full PAGE, not a modal (user, 2026-09-29: "restructure everything...
// doesn't have to be a pop up, make it a page... i want the same exact copy
// of this [the approved canvas design]. like everything including the font,
// spacing, sizing."). Markup, colors, spacing below are transcribed directly
// from the approved OCR Student Intake canvas's Main.dc.html -- same literal
// px values, not Tailwind's scale, so a side-by-side stays pixel-identical.
//
// Route: /students/scan. On success, hands the populated form to
// VerifyStudentForm.tsx (/students/scan/review) via router state -- nothing
// is ever saved from this page.

type ExtractedHandoff = {
  newPatient: NewPatientForm;
  confidences: Partial<Record<IptrOcrFieldKey, number>>;
  extractedKeys: (keyof NewPatientForm)[];
  ocrSourceLabel: 'scanned form' | 'uploaded file';
  sourceFileName: string;
  sourcePreviewUrl: string | null;
};

const ACCEPT = 'image/png,image/jpeg,image/jpg,application/pdf,text/csv,.csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const ScanStudentForm = () => {
  const navigate = useNavigate();
  const { selectedSchool } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pickFile = (f: File) => { setError(null); setFile(f); };

  const extract = async () => {
    if (!file) return;
    setError(null);
    setProcessing(true);
    setProgress(0);
    try {
      let handoff: ExtractedHandoff;
      if (/\.(csv|xlsx|xls)$/i.test(file.name)) {
        const [rec] = await parseSpreadsheetRecords(file);
        const get = (...keys: string[]) => { for (const k of keys) if (rec[k]) return rec[k]; return ''; };
        const sexRaw = get('sex', 'gender');
        const gradeRaw = get('grade_level', 'grade', 'gradelevel');
        const extractedKeys: (keyof NewPatientForm)[] = [];
        const set = (key: keyof NewPatientForm, value: string) => { if (value) extractedKeys.push(key); return value; };
        const fields: Partial<NewPatientForm> = {
          lastName: set('lastName', get('last_name', 'lastname', 'surname')),
          firstName: set('firstName', get('first_name', 'firstname', 'given_name')),
          middleName: set('middleName', get('middle_name', 'middlename')),
          birthdate: set('birthdate', get('birthday', 'birthdate', 'birth_date', 'date_of_birth')),
          gender: normalizeSex(sexRaw) ?? '',
          grade: (gradeRaw ? normalizeGrade(gradeRaw) : null) ?? '',
          section: get('section'),
          placeOfBirth: get('place_of_birth', 'placeofbirth', 'birthplace'),
          address: set('address', get('address')),
          contactNumber: set('contactNumber', get('contact_number', 'contact', 'contactnumber', 'phone')),
          guardianName: get('guardian_name', 'guardianname', 'parent_name'),
          guardianContact: get('guardian_contact', 'guardiancontact', 'guardian_contact_number'),
          guardianOccupation: get('occupation', 'guardian_occupation'),
          philhealthNumber: set('philhealthNumber', get('philhealth_number', 'philhealthnumber', 'philhealth_no', 'philhealth')),
        };
        if (normalizeSex(sexRaw)) extractedKeys.push('gender');
        if (gradeRaw && normalizeGrade(gradeRaw)) extractedKeys.push('grade');
        handoff = {
          newPatient: { ...BLANK_NEW_PATIENT, ...fields, school: selectedSchool ?? '' },
          confidences: {},
          extractedKeys,
          ocrSourceLabel: 'uploaded file',
          sourceFileName: file.name,
          sourcePreviewUrl: null,
        };
      } else {
        // Dynamic import keeps tesseract.js + pdfjs-dist (~1.5MB) out of the
        // main bundle -- only staff who actually scan a form download them.
        const { extractIptrFields } = await import('../utils/iptrOcr');
        const result = await extractIptrFields(file, setProgress);
        const f = result.fields;
        handoff = {
          newPatient: {
            ...BLANK_NEW_PATIENT,
            firstName: f.firstName ?? '', middleName: f.middleName ?? '', lastName: f.lastName ?? '',
            birthdate: f.birthdate ?? '', gender: f.gender ?? '', address: f.address ?? '',
            contactNumber: f.contactNumber ?? '', philhealthNumber: f.philhealthNumber ?? '',
            fourPsId: f.fourPsId ?? '', is4Ps: !!f.fourPsId,
            school: selectedSchool ?? '',
          },
          confidences: result.confidences,
          extractedKeys: Object.keys(result.confidences) as (keyof NewPatientForm)[],
          ocrSourceLabel: 'scanned form',
          sourceFileName: file.name,
          sourcePreviewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        };
      }
      navigate('/students/scan/review', { state: handoff });
    } catch (err) {
      setError(
        /\.(csv|xlsx|xls)$/i.test(file.name)
          ? (err instanceof Error ? err.message : 'Could not read the file. Check the column headers and try again.')
          : 'Could not read the image. Try a clearer photo or enter details manually.',
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ background: '#F6F9FC', minHeight: '100%', padding: '40px 56px', fontFamily: 'Inter, system-ui, sans-serif', color: '#141413' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F4F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#273A78" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V5a2 2 0 0 1 2-2h2"/><path d="M4 17v2a2 2 0 0 0 2 2h2"/><path d="M20 7V5a2 2 0 0 0-2-2h-2"/><path d="M20 17v2a2 2 0 0 1-2 2h-2"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#67687A' }}>Students &middot; OCR</div>
          <h1 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 700 }}>Scan a Student Form</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#67687A' }}>Capture a photo of the DOH IPTR form, or upload a file — matching fields will be filled in for you to verify.</p>
        </div>
      </div>

      {/* Two entry options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          style={{ boxSizing: 'border-box', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, padding: 24, background: '#fff', border: '2px solid #273A78', borderRadius: 16, boxShadow: '0 1px 2px rgba(15,23,42,0.06)', textAlign: 'left', font: 'inherit', color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F4F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#273A78" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Take a Photo</div>
          </div>
          <div style={{ fontSize: 13, color: '#67687A', textAlign: 'left' }}>Use this device's camera to capture the form directly.</div>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ boxSizing: 'border-box', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, padding: 24, background: '#fff', border: '2px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 2px rgba(15,23,42,0.06)', textAlign: 'left', font: 'inherit', color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ECECF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#141413" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Upload a File</div>
          </div>
          <div style={{ fontSize: 13, color: '#67687A', textAlign: 'left' }}>Choose an existing photo, scan, spreadsheet or document.</div>
        </button>
      </div>

      {/* Dropzone / selected file */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
        style={{ minHeight: 220, background: '#fff', border: '2px dashed #E2E8F0', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', cursor: 'pointer' }}
      >
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F6F9FC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ECECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#141413" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: '#67687A' }}>{(file.size / (1024 * 1024)).toFixed(1)} MB &middot; ready to extract</div>
            </div>
            <button
              type="button"
              aria-label="Remove selected file"
              onClick={() => setFile(null)}
              style={{ cursor: 'pointer', marginLeft: 8, width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#67687A', background: 'none', border: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#67687A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
            <div style={{ fontSize: 14, color: '#67687A', fontWeight: 500 }}>Drop a file here</div>
          </>
        )}
        <div style={{ fontSize: 13, color: '#67687A' }}>{file ? 'or drag a new file here to replace it' : 'or click to browse'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 560 }}>
          {['.jpg', '.jpeg', '.png', '.pdf', '.xlsx', '.csv'].map((ext) => (
            <span key={ext} style={{ fontSize: 11, fontWeight: 600, color: '#67687A', background: '#ECECF0', borderRadius: 999, padding: '3px 10px' }}>{ext}</span>
          ))}
        </div>
        <input
          ref={fileInputRef} type="file" accept={ACCEPT} style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) pickFile(e.target.files[0]); e.target.value = ''; }}
        />
      </div>

      {/* Note on how each type is read */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F4F7FF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', marginTop: 16 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#273A78" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <div style={{ fontSize: 12.5, color: '#33344a', lineHeight: 1.5 }}>
          Photos and PDFs are read with OCR against the printed DOH IPTR layout — name, birthday, sex, address, contact number and PhilHealth # are extracted (grade and section have no printed field, so they stay typed). A CSV or Excel file is read directly by its column headers instead, and can include grade/section if the file has them. Either way, nothing is saved until you verify it on the next screen.
        </div>
      </div>

      {processing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 13, color: '#67687A' }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', border: '3px solid #F4F7FF', borderTopColor: '#273A78', display: 'inline-block', animation: 'fl-spin 0.8s linear infinite' }} />
          <style>{'@keyframes fl-spin { to { transform: rotate(360deg); } }'}</style>
          Scanning form… {progress}%
        </div>
      )}
      {error && <p style={{ marginTop: 12, fontSize: 13, color: '#BE123C' }}>{error}</p>}

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
        <button
          type="button"
          onClick={() => navigate('/patients')}
          style={{ cursor: 'pointer', boxSizing: 'border-box', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#141413', border: '1px solid #E2E8F0', background: '#fff' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={extract}
          disabled={!file || processing}
          style={{ cursor: !file || processing ? 'not-allowed' : 'pointer', opacity: !file || processing ? 0.5 : 1, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#273A78', color: '#fff', border: 'none' }}
        >
          Extract Information
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>

      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={(f) => { setShowCamera(false); pickFile(f); }}
        />
      )}
    </div>
  );
};
