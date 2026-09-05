import { ArrowUpRight } from 'lucide-react'

import type { ReportRow } from '../../lib/mock-data'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'

type ReportTableProps = {
  rows: ReportRow[]
}

export function ReportTable({ rows }: ReportTableProps) {
  const cells = rows.map((row) => (
    <>
      <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{row.parameter}</td>
      <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{row.value}</td>
      <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{row.unit}</td>
      <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{row.referenceRange}</td>
      <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
        <Badge tone={row.status.toLowerCase().includes('below') ? 'warning' : row.status.toLowerCase().includes('above') ? 'warning' : 'success'}>
          {row.status}
        </Badge>
      </td>
      <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{row.source}</td>
    </>
  ))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black uppercase tracking-tight">Report Preview</h2>
        <button
          type="button"
          className="inline-flex items-center gap-2 border-2 border-ink bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        >
          Inspect
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>

      <Table
        headers={['Parameter', 'Value', 'Unit', 'Reference Range', 'Status', 'Source']}
        rows={cells}
      />
    </div>
  )
}
