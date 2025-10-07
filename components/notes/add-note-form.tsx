"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateNoteMutation } from '@/lib/queries'
import { useState } from 'react'

export function AddNoteForm({ folderId }: { folderId: string }) {
    const [value, setValue] = useState('')
    const { mutateAsync, isPending } = useCreateNoteMutation(folderId)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!value.trim()) return
        await mutateAsync({ title: value.trim() })
        setValue('')
    }

    return (
        <form onSubmit={onSubmit} className="flex gap-2">
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Add a note"
                className="flex-1"
                aria-label="Add note"
            />
            <Button type="submit" disabled={isPending || !value.trim()}>
                {isPending ? 'Adding…' : 'Add'}
            </Button>
        </form>
    )
}


