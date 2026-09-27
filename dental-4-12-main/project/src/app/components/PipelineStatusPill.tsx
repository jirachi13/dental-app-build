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

export const PipelineStatusPill = ({ status }: { status: StudentRow['pipelineStatus'] }) => {
  const meta = META[status];
  return (
    <span
      style={{ backgroundColor: meta.bg, color: meta.fg }}
      className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-normal"
    >
      {status}
    </span>
  );
};
