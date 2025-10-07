"use client"

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFoldersQuery } from '@/lib/queries'
import { useState } from 'react'

export function SearchFilter({ onChange }: { onChange: (opts: { folderId?: string | null; tags?: string[] }) => void }) {
    const { data: folders } = useFoldersQuery()
    const [folderId, setFolderId] = useState<string | null>(null)
    const [tags, setTags] = useState<string[]>([])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm">Filters</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="space-y-3">
                    <div>
                        <div className="text-xs mb-1">Folder</div>
                        <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={folderId ?? ''}
                            onChange={(e) => setFolderId(e.target.value || null)}
                        >
                            <option value="">All folders</option>
                            {folders?.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <div className="text-xs mb-1">Tags</div>
                        <input
                            className="w-full border rounded px-2 py-1 text-sm"
                            placeholder="comma,separated,tags"
                            onChange={(e) => setTags(e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => onChange({ folderId, tags })}>Apply</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}


