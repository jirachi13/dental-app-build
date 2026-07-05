export const studentListTableStyles = {
  wrapper: 'bg-white rounded-xl border border-gray-200 overflow-hidden',
  scroller: 'overflow-x-auto',
  table: 'w-full text-sm',
  head: 'bg-gray-50 border-b border-gray-200',
  headerCell: 'text-left px-4 py-3 font-semibold text-gray-700',
  body: 'divide-y divide-gray-100',
  row: 'hover:bg-gray-50 transition-colors cursor-pointer',
  primaryCell: 'px-4 py-3 font-medium text-gray-900',
  secondaryCell: 'px-4 py-3 text-gray-600',
  emptyCell: 'text-center py-12 text-gray-500',
  footer: 'px-4 py-3 border-t border-gray-100 text-sm text-gray-500',
} as const;
