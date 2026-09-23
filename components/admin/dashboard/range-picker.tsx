'use client'

import { useQueryStates } from 'nuqs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RANGE_PRESETS, RANGE_PRESET_LABELS, type RangePreset } from '@/lib/analytics/ranges'

/** The selected range lives in the URL, so a report can be shared or reloaded. */
export function RangePicker() {
  const [{ preset, from, to }, setRange] = useQueryStates(
    {
      preset: { defaultValue: '30d', parse: (value: string) => value },
      from: { defaultValue: '', parse: (value: string) => value },
      to: { defaultValue: '', parse: (value: string) => value },
    },
    { shallow: false },
  )

  const active = (preset || '30d') as RangePreset

  return (
    <div className="mb-6 flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1.5">
        {RANGE_PRESETS.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={active === value ? 'default' : 'outline'}
            onClick={() => setRange({ preset: value })}
          >
            {RANGE_PRESET_LABELS[value]}
          </Button>
        ))}
      </div>

      {active === 'custom' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="range-from" className="text-xs">
              Эхлэх
            </Label>
            <Input
              id="range-from"
              type="date"
              className="w-36"
              value={from}
              onChange={(event) => setRange({ from: event.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="range-to" className="text-xs">
              Дуусах
            </Label>
            <Input
              id="range-to"
              type="date"
              className="w-36"
              value={to}
              onChange={(event) => setRange({ to: event.target.value || null })}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
