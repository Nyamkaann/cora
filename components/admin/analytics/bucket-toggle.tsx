'use client'

import { useQueryState } from 'nuqs'

import { Button } from '@/components/ui/button'

const OPTIONS = [
  { value: 'day', label: 'Өдрөөр' },
  { value: 'week', label: '7 хоногоор' },
  { value: 'month', label: 'Сараар' },
] as const

export function BucketToggle({ current }: { current: 'day' | 'week' | 'month' }) {
  const [, setBucket] = useQueryState('bucket', { defaultValue: current, shallow: false })

  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={current === option.value ? 'default' : 'outline'}
          onClick={() => setBucket(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
