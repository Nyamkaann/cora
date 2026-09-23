'use client'

import { useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { parseMoney, toDbNumeric } from '@/lib/money'

function withGrouping(raw: string): string {
  const cleaned = raw.replace(/[^\d.-]/g, '')
  const isNegative = cleaned.startsWith('-')
  const [whole = '', fraction] = cleaned.replace(/-/g, '').split('.')
  const grouped = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `${isNegative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction.slice(0, 2)}`}`
}

/**
 * Money field with thousand separators. Emits a plain decimal string
 * ("125000.00") so it can go straight into a numeric(14,2) column.
 */
export function MoneyInput({
  value,
  onChange,
  id,
  name,
  placeholder = '0',
  disabled,
  className,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
  name?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [display, setDisplay] = useState(() =>
    value === '' ? '' : withGrouping(parseMoney(value).toString()),
  )

  // Track what this field last emitted so typing is never reformatted
  // mid-keystroke, while a value set from outside (the "copy prices to every
  // row" button, for instance) still shows up.
  const lastEmitted = useRef(value)
  const [lastProp, setLastProp] = useState(value)

  if (value !== lastProp) {
    setLastProp(value)
    if (value !== lastEmitted.current) {
      setDisplay(value === '' ? '' : withGrouping(parseMoney(value).toString()))
    }
  }

  return (
    <Input
      id={id}
      name={name}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      value={display}
      onChange={(event) => {
        const next = withGrouping(event.target.value)
        setDisplay(next)
        const emitted = next === '' ? '' : toDbNumeric(next)
        lastEmitted.current = emitted
        onChange(emitted)
      }}
      onBlur={() => {
        setDisplay(display === '' ? '' : withGrouping(toDbNumeric(display)))
      }}
    />
  )
}
