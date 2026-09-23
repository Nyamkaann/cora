'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BulkPosters } from '@/components/admin/posters/bulk-posters'
import { TemplateEditor } from '@/components/admin/posters/template-editor'
import { TemplateList } from '@/components/admin/posters/template-list'
import type { PosterProductOption, PosterTemplate } from '@/server/queries/posters'

export function PostersWorkspace({
  templates,
  products,
}: {
  templates: PosterTemplate[]
  products: PosterProductOption[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null)

  const selected = templates.find((template) => template.id === selectedId) ?? null
  const defaultTemplateId = templates.find((template) => template.isDefault)?.id ?? null

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Загварууд</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId(null)}>
            <Plus className="size-3.5" />
            Шинэ загвар
          </Button>
        </div>
        <TemplateList templates={templates} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <TemplateEditor
        key={selected?.id ?? 'new'}
        template={selected}
        products={products}
      />

      <BulkPosters products={products} templateId={selectedId ?? defaultTemplateId} />
    </div>
  )
}
