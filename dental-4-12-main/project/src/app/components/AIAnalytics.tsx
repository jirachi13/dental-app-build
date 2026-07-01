import { Brain } from 'lucide-react';

// Predictive analytics (Phase 3 / Sprint 21a) hasn't been built yet -- it's
// blocked on real dental IPTR data, and no model has been trained. This page
// previously showed entirely fabricated AI predictions, confidence scores,
// and FAKE dentist validation records ("validated: true, validatedBy: 'Dr.
// Maria Santos'") for made-up students -- presenting fictional clinical
// validation as if it had really happened, which directly undermines the
// "dentist must validate before clinical action" safety rule. An honest
// empty state is correct here until the real pipeline exists, never
// fabricated output.
export const AIAnalytics = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Classification</h1>
        <p className="text-sm text-gray-500 mt-0.5">Predictive dental health risk classification</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Predictive Analytics Not Yet Available</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          The risk classification model hasn't been trained yet — it requires real historical dental
          records, which are still being collected and cleaned. Once training data is ready and a
          model is selected, this page will show real risk classifications for review and validation.
        </p>
      </div>
    </div>
  );
};
