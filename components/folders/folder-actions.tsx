"use client"

import { Button } from '@/components/ui/button';
import { useArchiveFolderMutation } from '@/lib/queries';

export function FolderActions({ folderId, archivedAt }: { folderId: string; archivedAt: string | null }) {
    const archive = useArchiveFolderMutation()
    const isArchived = Boolean(archivedAt)
    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => archive.mutate({ folderId, archived: !isArchived })}
                disabled={archive.isPending}
            >
                {isArchived ? 'Unarchive' : 'Archive'}
            </Button>
        </div>
    )
}


