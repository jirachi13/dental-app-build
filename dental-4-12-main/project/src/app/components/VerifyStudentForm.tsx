import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useSchools } from '../hooks/useSchools';
import { apiClient, ApiError } from '../api/client';
import { schoolYearLabel } from '../utils/schoolYear';
import { GRADES } from './PromoteAssign';
import {
  BLANK_NEW_PATIENT, REQUIRED_STUDENT_FIELDS, duplicatesFromError,
  type NewPatientForm, type DuplicateCandidate,
} from './PatientList';
import type { IptrOcrFieldKey } from '../utils/iptrOcrShared';
// Same shared value-format rules the manual Add Student form and the server use.
import { validateStudentValues } from '../../../shared/studentValidation';

// Full PAGE, not a modal (see ScanStudentForm.tsx for the fuller rationale).
// Markup, colors and spacing transcribed directly from the approved OCR
// Student Intake canvas's Review.dc.html. Route: /students/scan/review,
// reached only via router state handed off by ScanStudentForm -- there is
// nothing to verify without it, so a direct/refreshed visit bounces back.

type ExtractedHandoff = {
  newPatient: NewPatientForm;
  confidences: Partial<Record<IptrOcrFieldKey, number>>;
  extractedKeys: (keyof NewPatientForm)[];
  ocrSourceLabel: 'scanned form' | 'uploaded file';
  sourceFileName: string;
  sourcePreviewUrl: string | null;
};

const calculateAge = (birthdate: string) => {
  const today = new Date(); const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box', width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
  borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', color: '#141413', background: '#fff',
};

const Label = ({ children, extracted, required }: { children: React.ReactNode; extracted?: boolean; required?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33344a', marginBottom: 6 }}>
    {children} {required && <span style={{ color: '#BE123C' }}>*</span>}
    {extracted && (
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#15803D', background: '#F0FDF4', border: '1px solid rgba(21,128,61,0.25)', borderRadius: 999, padding: '1px 7px' }}>
        Extracted
      </span>
    )}
  </div>
);

export const VerifyStudentForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSchool } = useAuth();
  const toast = useToast();
  const { schools } = useSchools();
  const handoff = location.state as ExtractedHandoff | null;

  const [form, setForm] = useState<NewPatientForm>(handoff?.newPatient ?? BLANK_NEW_PATIENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<keyof NewPatientForm>>(new Set());
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null);

  // No handoff (direct visit, or a page refresh -- router state doesn't
  // survive one) means there's nothing to verify.
  useEffect(() => { if (!handoff) navigate('/students/scan', { replace: true }); }, [handoff, navigate]);
  if (!handoff) return null;

  const isExtracted = (key: keyof NewPatientForm) =>
    key in handoff.confidences || handoff.extractedKeys.includes(key);

  const update = (key: keyof NewPatientForm, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setMissing((prev) => { if (!prev.has(key)) return prev; const next = new Set(prev); next.delete(key); return next; });
  };

  const age = calculateAge(form.birthdate);

  const save = async (confirmDuplicate = false) => {
    setError(null);
    if (!confirmDuplicate) {
      const missingFields = REQUIRED_STUDENT_FIELDS
        .filter(({ onlyIf }) => (onlyIf ? onlyIf(form) : true))
        .filter(({ key }) => !String(form[key] ?? '').trim());
      if (missingFields.length) {
        setMissing(new Set(missingFields.map((m) => m.key)));
        setError(`Please fill in: ${missingFields.map((m) => m.label).join(', ')}.`);
        return;
      }
      setMissing(new Set());
      const valueProblems = validateStudentValues({
        lastName: form.lastName, firstName: form.firstName, middleName: form.middleName,
        birthdate: form.birthdate, contactNumber: form.contactNumber, guardianContact: form.guardianContact,
      });
      if (valueProblems.length) { setError(valueProblems.join(' ')); return; }
    }
    const school = schools.find((s) => s.school_name === (form.school || selectedSchool));
    if (!school) { setError('Selected school not found.'); return; }
    setSaving(true);
    try {
      const created = await apiClient.post<{ _id: string }>('/students', {
        school_id: school._id,
        last_name: form.lastName, first_name: form.firstName, middle_name: form.middleName,
        birthday: form.birthdate, sex: form.gender, address: form.address, contact_number: form.contactNumber,
        grade_level: form.grade, section: form.section, is_not_student: form.isNotStudent,
        place_of_birth: form.placeOfBirth, guardian_name: form.guardianName, guardian_contact: form.guardianContact,
        guardian_occupation: form.guardianOccupation, philhealth_number: form.philhealthNumber,
        philhealth_status: form.philhealthNumber.trim() ? form.philhealthStatus : 'None',
        is_4ps: form.is4Ps, fourps_id: form.fourPsId,
        ...(confirmDuplicate ? { confirm_duplicate: true } : {}),
      });
      try {
        await apiClient.post('/student-iptrs', {
          student_id: created._id, school_year: schoolYearLabel(),
          grade_level: form.isNotStudent ? null : form.grade, section: form.isNotStudent ? null : form.section,
          consent_status: form.consentStatus,
        });
      } catch { /* best-effort -- the chart's own "Add Year" still works */ }
      toast.success(`Student added: ${form.lastName}, ${form.firstName} · ${schoolYearLabel()} record opened`);
      navigate(`/dental-chart/${created._id}?tab=history`);
    } catch (err) {
      const dupes = duplicatesFromError(err);
      if (dupes) { setDuplicates(dupes); return; }
      setError(err instanceof ApiError ? err.message : 'Failed to save student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#F6F9FC', minHeight: '100%', padding: '32px 48px', fontFamily: 'Inter, system-ui, sans-serif', color: '#141413' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F4F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#273A78" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#67687A' }}>Students &middot; OCR</div>
            <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 700 }}>Verify Extracted Information</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/students/scan')}
          style={{ cursor: 'pointer', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#141413', border: '1px solid #E2E8F0', background: '#fff' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Back
        </button>
      </div>

      {/* Verification banner */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FEF3C7', border: '1px solid #f3d99a', borderRadius: 12, padding: '10px 16px', marginBottom: 18 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <div style={{ fontSize: 12.5, color: '#7a4a0a', lineHeight: 1.5 }}>
          Nothing is saved yet. {handoff.ocrSourceLabel === 'scanned form'
            ? <>Compare each field marked <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#15803D', background: '#F0FDF4', border: '1px solid rgba(21,128,61,0.25)', borderRadius: 999, padding: '1px 7px' }}>Extracted</span> against the source image and correct anything OCR misread, then fill in the rest before confirming.</>
            : <>Compare each field marked <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#15803D', background: '#F0FDF4', border: '1px solid rgba(21,128,61,0.25)', borderRadius: 999, padding: '1px 7px' }}>Extracted</span> against the uploaded file and correct anything before confirming.</>}
        </div>
      </div>

      {duplicates && (
        <div style={{ background: '#FFF1F2', border: '1px solid rgba(190,18,60,0.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 18, fontSize: 12.5, color: '#BE123C' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Possible duplicate</p>
          <p style={{ margin: '2px 0 8px' }}>
            {duplicates[0].full_name} is already on file, born {duplicates[0].birthday} ({duplicates[0].grade_level} {duplicates[0].section}).
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setDuplicates(null)} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: '1px solid rgba(190,18,60,0.3)', background: '#fff', color: '#BE123C' }}>Let me edit</button>
            <button type="button" onClick={() => { setDuplicates(null); void save(true); }} style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', background: '#BE123C', color: '#fff' }}>Save anyway — different student</button>
          </div>
        </div>
      )}

      {/* Body: source + form */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 24 }}>
        {/* Source thumbnail */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, alignSelf: 'start' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#67687A' }}>Source</div>
          <div style={{ width: '100%', aspectRatio: '3/4', background: '#ECECF0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98999f', overflow: 'hidden' }}>
            {handoff.sourcePreviewUrl ? (
              <img src={handoff.sourcePreviewUrl} alt="Source form" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            )}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, wordBreak: 'break-word' }}>{handoff.sourceFileName}</div>
          {handoff.sourcePreviewUrl && (
            <a href={handoff.sourcePreviewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#273A78', fontWeight: 600, textDecoration: 'none' }}>View full size &rarr;</a>
          )}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            <div>
              <Label required extracted={isExtracted('lastName')}>Last Name</Label>
              <input style={inputStyle} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </div>
            <div>
              <Label required extracted={isExtracted('firstName')}>First Name</Label>
              <input style={inputStyle} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </div>
            <div>
              <Label extracted={isExtracted('middleName')}>Middle Name</Label>
              <input style={inputStyle} value={form.middleName} onChange={(e) => update('middleName', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            <div>
              <Label required extracted={isExtracted('birthdate')}>Birthdate</Label>
              <input type="date" style={inputStyle} value={form.birthdate} onChange={(e) => update('birthdate', e.target.value)} />
            </div>
            <div>
              <Label>Age <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#67687A', background: '#ECECF0', borderRadius: 999, padding: '1px 7px' }}>Auto-calculated</span></Label>
              <input style={{ ...inputStyle, background: '#F6F9FC', color: '#67687A' }} value={age ?? ''} disabled />
            </div>
            <div>
              <Label required extracted={isExtracted('gender')}>Sex</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Male', 'Female'].map((s) => {
                  const active = form.gender === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update('gender', s)}
                      style={{ cursor: 'pointer', boxSizing: 'border-box', flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: active ? 700 : 600, background: active ? '#F4F7FF' : '#fff', border: active ? '1.5px solid #273A78' : '1.5px solid #E2E8F0', color: active ? '#273A78' : '#67687A' }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <div>
              <Label required>Grade</Label>
              <select style={{ ...inputStyle, appearance: 'auto' }} value={form.grade} onChange={(e) => update('grade', e.target.value)}>
                <option value="">Select Grade</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <Label required>Section</Label>
              <input style={inputStyle} placeholder="Search or add a section" value={form.section} onChange={(e) => update('section', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <div>
              <Label>Place of Birth <span style={{ color: '#98999f', fontWeight: 500 }}>(Optional)</span></Label>
              <input style={inputStyle} placeholder="e.g. Taguig City" value={form.placeOfBirth} onChange={(e) => update('placeOfBirth', e.target.value)} />
            </div>
            <div>
              <Label extracted={isExtracted('contactNumber')}><>Contact Number <span style={{ color: '#98999f', fontWeight: 500 }}>(Optional)</span></></Label>
              <input style={inputStyle} placeholder="09XX-XXX-XXXX" value={form.contactNumber} onChange={(e) => update('contactNumber', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <div>
              <Label>Guardian Name <span style={{ color: '#98999f', fontWeight: 500 }}>(Optional)</span></Label>
              <input style={inputStyle} placeholder="Full name" value={form.guardianName} onChange={(e) => update('guardianName', e.target.value)} />
            </div>
            <div>
              <Label>Guardian Contact <span style={{ color: '#98999f', fontWeight: 500 }}>(Optional)</span></Label>
              <input style={inputStyle} placeholder="09XX-XXX-XXXX" value={form.guardianContact} onChange={(e) => update('guardianContact', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <div>
              <Label>Occupation <span style={{ color: '#98999f', fontWeight: 500 }}>(Optional)</span></Label>
              <input style={inputStyle} placeholder="Guardian's occupation" value={form.guardianOccupation} onChange={(e) => update('guardianOccupation', e.target.value)} />
            </div>
            <div>
              <Label extracted={isExtracted('philhealthNumber')}><>PhilHealth Number <span style={{ color: '#98999f', fontWeight: 500 }}>(Optional)</span></></Label>
              <input style={inputStyle} placeholder="XX-XXXXXXXXX-X" value={form.philhealthNumber} onChange={(e) => update('philhealthNumber', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <div>
              <Label>PhilHealth Status</Label>
              <select style={{ ...inputStyle, appearance: 'auto' }} value={form.philhealthStatus} onChange={(e) => update('philhealthStatus', e.target.value)}>
                <option>None</option>
                <option>Member</option>
                <option>Dependent</option>
              </select>
            </div>
            <div>
              <Label extracted={isExtracted('address')}><>Address <span style={{ color: '#98999f', fontWeight: 500 }}>(Optional)</span></></Label>
              <input style={inputStyle} value={form.address} onChange={(e) => update('address', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ marginTop: 16, fontSize: 13, color: '#BE123C' }}>{error}</p>}
      {missing.size > 0 && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#BE123C' }}>Highlighted fields above are required.</p>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
        <button
          type="button"
          onClick={() => navigate('/students/scan')}
          style={{ cursor: 'pointer', boxSizing: 'border-box', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#141413', border: '1px solid #E2E8F0', background: '#fff' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={saving}
          style={{ cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#273A78', color: '#fff', border: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          {saving ? 'Saving…' : 'Confirm & Save Student'}
        </button>
      </div>
    </div>
  );
};
