import { computeDMFT, type ChartEntry } from '../utils/dentalChartCodes';
import type { IptrYearData } from '../hooks/useDentalChartData';

// The Dental Records tab — DMFT progression across a pupil's school years.
//
// Extracted from `DentalChart.tsx` in Sprint 162b, unchanged. It was the
// obvious first tab to lift: of the seven panels in that component this is the
// only one that reads NOTHING but `years` — no handlers, no local state, no
// callbacks — so the move needs one prop and can change no behaviour.
//
// The other six tabs are genuine seams too, but each shares mutable chart state
// with the host and will need its handlers threaded deliberately. This one is
// the pattern, not the precedent for rushing those.

export function DmftHistoryTab({ years }: { years: IptrYearData[] }) {
  const dmftByYear = years.map((y) => {
    const chart: Record<number, ChartEntry> = {};
    for (const tr of y.toothRecords) chart[tr.tooth_number] = { condition: tr.condition, treatment: tr.treatment_code ?? '' };
    return { year: y.iptr.school_year, ...computeDMFT(chart) };
  });

  if (dmftByYear.length === 0) {
    return <div className="p-8 text-center text-muted-foreground text-sm">No records yet.</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">DMFT Progression by School Year</h3>
        <p className="text-xs text-muted-foreground">Lowercase (d m f x · dmft) = primary / deciduous teeth; uppercase (D M F X · DMFT) = permanent teeth. A child with both present is in mixed dentition.</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">School Year</th>
              {['d', 'm', 'f', 'x', 'dmft', 'D', 'M', 'F', 'X', 'DMFT'].map((h) => (
                <th key={h} className={`px-2 py-2 text-center text-xs font-medium ${h === 'dmft' || h === 'DMFT' ? 'bg-gray-100 font-bold text-foreground' : h === h.toLowerCase() ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dmftByYear.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-card' : 'bg-gray-50/50'}>
                <td className="px-4 py-2 font-medium text-foreground text-xs">{row.year}</td>
                <td className="px-2 py-2 text-center text-xs text-red-700">{row.d || ''}</td>
                <td className="px-2 py-2 text-center text-xs text-slate-600">{row.m || ''}</td>
                <td className="px-2 py-2 text-center text-xs text-blue-700">{row.f || ''}</td>
                <td className="px-2 py-2 text-center text-xs text-orange-700">{row.x || ''}</td>
                <td className="px-2 py-2 text-center text-xs font-bold text-foreground bg-gray-100">{row.t}</td>
                <td className="px-2 py-2 text-center text-xs text-red-700">{row.D || ''}</td>
                <td className="px-2 py-2 text-center text-xs text-slate-600">{row.M || ''}</td>
                <td className="px-2 py-2 text-center text-xs text-blue-700">{row.F || ''}</td>
                <td className="px-2 py-2 text-center text-xs text-orange-700">{row.X || ''}</td>
                <td className="px-2 py-2 text-center text-xs font-bold text-foreground bg-gray-100">{row.T}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Latest dmft (primary)', value: dmftByYear[dmftByYear.length - 1].t, color: 'text-red-700 bg-red-50' },
          { label: 'Latest DMFT (permanent)', value: dmftByYear[dmftByYear.length - 1].T, color: 'text-blue-700 bg-blue-50' },
          { label: 'Years tracked', value: dmftByYear.length, color: 'text-foreground bg-gray-100' },
          // A trend needs 2+ years; equal values are Stable, not Improving (DMFT is cumulative)
          { label: 'Trend', value: dmftByYear.length < 2 ? '—' : dmftByYear[dmftByYear.length - 1].T > dmftByYear[0].T ? '↑ Worsening' : dmftByYear[dmftByYear.length - 1].T < dmftByYear[0].T ? '↓ Improving' : 'Stable', color: dmftByYear.length >= 2 && dmftByYear[dmftByYear.length - 1].T > dmftByYear[0].T ? 'text-red-700 bg-red-50' : dmftByYear.length >= 2 && dmftByYear[dmftByYear.length - 1].T < dmftByYear[0].T ? 'text-green-700 bg-green-50' : 'text-foreground bg-gray-100' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-lg p-3 ${kpi.color}`}>
            <div className="text-xl font-bold">{kpi.value}</div>
            <div className="text-xs mt-0.5 opacity-80">{kpi.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
