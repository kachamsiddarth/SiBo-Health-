import type { ReactNode } from 'react'

type TableProps = {
  headers: string[]
  rows: ReactNode[]
}

export function Table({ headers, rows }: TableProps) {
  return (
    <div className="overflow-x-auto border-2 border-ink bg-white shadow-brutal">
      <table className="min-w-full border-collapse text-left">
        <thead className="bg-stone-100">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b-2 border-ink px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="align-top odd:bg-stone-50">
              {row}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
