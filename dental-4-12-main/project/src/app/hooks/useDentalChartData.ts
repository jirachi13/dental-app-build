import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type {
  ApiStudent,
  ApiSchool,
  ApiStudentIptr,
  ApiMedicalHistory,
  ApiDietarySocialHabits,
  ApiOralHealthCondition,
  ApiDentalChart,
  ApiToothRecord,
  ApiTreatment,
  ApiDentist,
} from '../api/types';

export interface IptrYearData {
  iptr: ApiStudentIptr;
  medicalHistory: ApiMedicalHistory | null;
  dietaryHabits: ApiDietarySocialHabits | null;
  oralCondition: ApiOralHealthCondition | null;
  dentalChart: ApiDentalChart | null;
  toothRecords: ApiToothRecord[];
  treatments: ApiTreatment[];
}

export function useDentalChartData(studentId: string | undefined) {
  const [student, setStudent] = useState<ApiStudent | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [years, setYears] = useState<IptrYearData[]>([]);
  const [dentists, setDentists] = useState<ApiDentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [studentDoc, schools, allIptrs, dentistList] = await Promise.all([
        apiClient.get<ApiStudent>(`/students/${studentId}`),
        apiClient.get<ApiSchool[]>('/schools'),
        apiClient.get<ApiStudentIptr[]>('/student-iptrs'),
        apiClient.get<ApiDentist[]>('/dentists'),
      ]);

      setStudent(studentDoc);
      setSchoolName(schools.find((s) => s._id === studentDoc.school_id)?.school_name ?? 'Unknown School');
      setDentists(dentistList);

      const myIptrs = allIptrs
        .filter((i) => i.student_id === studentId)
        .sort((a, b) => a.school_year.localeCompare(b.school_year));
      const iptrIds = new Set(myIptrs.map((i) => i._id));

      const [allMedical, allDiet, allOral, allCharts, allTreatments] = await Promise.all([
        apiClient.get<ApiMedicalHistory[]>('/medical-histories'),
        apiClient.get<ApiDietarySocialHabits[]>('/dietary-social-habits'),
        apiClient.get<ApiOralHealthCondition[]>('/oral-health-conditions'),
        apiClient.get<ApiDentalChart[]>('/dental-charts'),
        apiClient.get<ApiTreatment[]>('/treatments'),
      ]);

      const myCharts = allCharts.filter((c) => iptrIds.has(c.iptr_id));
      const chartIds = new Set(myCharts.map((c) => c._id));
      const allToothRecords = chartIds.size
        ? await apiClient.get<ApiToothRecord[]>('/tooth-records')
        : [];

      const yearData: IptrYearData[] = myIptrs.map((iptr) => {
        const dentalChart = myCharts.find((c) => c.iptr_id === iptr._id) ?? null;
        return {
          iptr,
          medicalHistory: allMedical.find((m) => m.iptr_id === iptr._id) ?? null,
          dietaryHabits: allDiet.find((d) => d.iptr_id === iptr._id) ?? null,
          oralCondition: allOral.find((o) => o.iptr_id === iptr._id) ?? null,
          dentalChart,
          toothRecords: dentalChart ? allToothRecords.filter((t) => t.chart_id === dentalChart._id) : [],
          treatments: allTreatments.filter((t) => t.iptr_id === iptr._id),
        };
      });

      setYears(yearData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dental chart data');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { student, schoolName, years, dentists, loading, error, reload };
}
