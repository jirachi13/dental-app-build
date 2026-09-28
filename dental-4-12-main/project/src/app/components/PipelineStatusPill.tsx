import type { StudentRow } from '../hooks/useStudents';

// Filled-pill badge for a pupil's treatment-pipeline stage this school year
// (user, 2026-09-28, chose "Option A -- matches GradePill's own style" from
// the design review). Colors read as a rough traffic-light: gray = not
// started, amber/blue = in progress, green = done.
const META: Record<StudentRow['pipelineStatus'], { bg: string; fg: string }> = {
  'For Oral Exam': { bg: '#F1F5F9', fg: '#475569' },
  'For First Treatment': { bg: '#FEF3C7', fg: '#B45309' },
  'For Second Treatment': { bg: '#DBEAFE', fg: '#1D4ED8' },
  Completed: { bg: '#DCFCE7', fg: '#15803D' },
};

// Display text only (user, 2026-09-28: "For Visit 1"/"For Visit 2" read
// clearer than "For First/Second Treatment") -- the underlying
// StudentRow['pipelineStatus'] values are unchanged, since filtering
// (TreatmentRecords.tsx's pipelineFilter) and the server both match against
// the original strings.
const LABEL: Record<StudentRow['pipelineStatus'], string> = {
  'For Oral Exam': 'For Oral Exam',
  'For First Treatment': 'For Visit 1',
  'For Second Treatment': 'For Visit 2',
  Completed: 'Completed',
};

export const PipelineStatusPill = ({ status }: { status: StudentRow['pipelineStatus'] }) => {
  const meta = META[status];
  return (
    <span
      style={{ backgroundColor: meta.bg, color: meta.fg }}
      className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
    >
      {LABEL[status]}
      {/* Visit 2 IS the RPC protocol's second visit -- derivePipelineStatus
          (server) only reaches "For Second Treatment" once a Visit 1
          PreventiveCareRecord exists and Visit 2 doesn't yet, which is
          exactly what RPC Monitoring tracks. Small solid chip, "Option C"
          from the design review (user, 2026-09-28). */}
      {status === 'For Second Treatment' && (
        <span style={{ backgroundColor: meta.fg }} className="ml-1.5 rounded-full px-1.5 py-px text-[8px] font-extrabold tracking-wide text-white">
          RPC
        </span>
      )}
    </span>
  );
};
