'use client'

import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

import { cn } from '@/lib/utils'
import type { PosterLayout } from '@/lib/poster/layout'

type BoxKey = 'product' | 'title' | 'price' | 'logo'

const BOX_LABELS: Record<BoxKey, string> = {
  product: 'Бараа',
  title: 'Нэр',
  price: 'Үнэ',
  logo: 'Лого',
}

function boxRect(layout: PosterLayout, key: BoxKey) {
  if (key === 'product') return layout.product
  if (key === 'logo') {
    return { x: layout.logo.x, y: layout.logo.y, w: layout.logo.w, h: layout.logo.w * 0.5 }
  }
  const text = key === 'title' ? layout.title : layout.price
  const lines = key === 'title' ? Math.max(1, layout.title.maxLines) : 1
  return { x: text.x, y: text.y, w: text.w, h: text.size * 1.2 * lines }
}

/**
 * Drag the boxes straight on the background. Everything is stored in canvas
 * pixels; the preview just scales them.
 */
export function LayoutCanvas({
  layout,
  backgroundUrl,
  selected,
  onSelect,
  onMove,
  onResizeProduct,
}: {
  layout: PosterLayout
  backgroundUrl: string | null
  selected: BoxKey
  onSelect: (key: BoxKey) => void
  onMove: (key: BoxKey, x: number, y: number) => void
  onResizeProduct: (w: number, h: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  function scale(): number {
    const width = containerRef.current?.clientWidth ?? layout.canvas.width
    return width / layout.canvas.width
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, key: BoxKey) {
    event.preventDefault()
    onSelect(key)

    const rect = boxRect(layout, key)
    const factor = scale()
    const startX = event.clientX
    const startY = event.clientY
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)

    function move(moveEvent: PointerEvent) {
      const nextX = rect.x + (moveEvent.clientX - startX) / factor
      const nextY = rect.y + (moveEvent.clientY - startY) / factor
      onMove(key, Math.round(nextX), Math.round(nextY))
    }

    function stop() {
      target.releasePointerCapture(event.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  function startResize(event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()

    const factor = scale()
    const startX = event.clientX
    const startY = event.clientY
    const startW = layout.product.w
    const startH = layout.product.h

    function move(moveEvent: PointerEvent) {
      const nextW = Math.max(40, startW + (moveEvent.clientX - startX) / factor)
      const nextH = Math.max(40, startH + (moveEvent.clientY - startY) / factor)
      onResizeProduct(Math.round(nextW), Math.round(nextH))
    }

    function stop() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  const keys: BoxKey[] = ['product', 'title', 'price', 'logo']

  return (
    <div
      ref={containerRef}
      className="relative w-full touch-none overflow-hidden rounded-lg border bg-muted"
      style={{ aspectRatio: `${layout.canvas.width} / ${layout.canvas.height}` }}
    >
      {backgroundUrl ? (
        // Storage host is not registered with next/image in the MVP.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backgroundUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Дэвсгэр зураг оруулаагүй
        </div>
      )}

      {keys.map((key) => {
        const rect = boxRect(layout, key)
        const isSelected = selected === key

        return (
          <div
            key={key}
            role="button"
            tabIndex={0}
            onPointerDown={(event) => startDrag(event, key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(key)
            }}
            className={cn(
              'absolute cursor-move rounded border-2 bg-background/20',
              isSelected ? 'border-primary' : 'border-dashed border-foreground/40',
            )}
            style={{
              left: `${(rect.x / layout.canvas.width) * 100}%`,
              top: `${(rect.y / layout.canvas.height) * 100}%`,
              width: `${(rect.w / layout.canvas.width) * 100}%`,
              height: `${(rect.h / layout.canvas.height) * 100}%`,
            }}
          >
            <span className="absolute -top-5 left-0 rounded bg-foreground px-1 text-[10px] text-background">
              {BOX_LABELS[key]}
            </span>

            {key === 'product' ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Бараа хайрцгийн хэмжээ"
                onPointerDown={startResize}
                className="absolute -right-1.5 -bottom-1.5 size-3 cursor-se-resize rounded-full border-2 border-primary bg-background"
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
