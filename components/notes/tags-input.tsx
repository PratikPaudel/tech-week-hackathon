"use client"

import { useState } from 'react';

export function TagsInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
    const [input, setInput] = useState('')
    const add = () => {
        const v = input.trim()
        if (!v) return
        const next = Array.from(new Set([...(value ?? []), v]))
        onChange(next)
        setInput('')
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            {value?.map((t) => (
                <button
                    key={t}
                    type="button"
                    className="text-xs bg-muted px-2 py-0.5 rounded-full hover:bg-muted/80"
                    onClick={() => onChange((value ?? []).filter((x) => x !== t))}
                    title="Remove tag"
                >
                    {t} ×
                </button>
            ))}
            <input
                className="border rounded px-2 py-0.5 text-xs"
                placeholder="add tag"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') add()
                }}
            />
        </div>
    )
}


