import { FileText, LoaderCircle, Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'

type ReportInputProps = {
  onSubmit: (input: { text: string; reportDate?: string; fileName?: string }) => Promise<void> | void
  isLoading?: boolean
  error?: string | null
}

export function ReportInput({ onSubmit, isLoading = false, error = null }: ReportInputProps) {
  const [text, setText] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [fileName, setFileName] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!text.trim()) {
      return
    }

    await onSubmit({ text, reportDate: reportDate || undefined, fileName: fileName || undefined })
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-amber-200 shadow-brutal">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Medical report</p>
          <h2 className="text-2xl font-black">Report intake</h2>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Textarea
          label="Paste report text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste the lab report or clinical note here. Example: Hemoglobin 13.2 g/dL (12.0 - 16.0)"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Report date"
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
          />

          <label className="block text-left">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Optional PDF</span>
            <div className="flex items-center gap-2 border-2 border-ink bg-white px-3 py-2 text-sm shadow-brutal">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept="application/pdf"
                className="w-full text-sm text-slate-700 file:mr-2 file:rounded-none file:border-2 file:border-ink file:bg-stone-100 file:px-2 file:py-1"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
              />
            </div>
          </label>
        </div>

        {error && (
          <div className="border-2 border-red-600 bg-red-100 p-3 text-sm font-bold text-red-800 shadow-brutal">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={isLoading || !text.trim()} className="gap-2">
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {isLoading ? 'Analyzing report...' : 'Extract Report'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
