// Filename: components/notes/backlinks.tsx
"use client"
import { useBacklinksQuery } from '@/lib/queries';
import Link from 'next/link';

interface Backlink {
    id: string;
    title: string;
    folder_id: string;
    folder_name: string;
}

export function Backlinks({ noteId }: { noteId: string }) {
    const { data: backlinks, isLoading } = useBacklinksQuery(noteId);

    if (isLoading || !backlinks || backlinks.length === 0) {
        return null; // Don't render anything if there are no backlinks
    }

    return (
        <div className="mt-8 pt-4 border-t">
            <h3 className="text-md font-semibold mb-3">Linked Mentions</h3>
            <div className="space-y-2">
                {backlinks.map((link: Backlink) => (
                    <Link
                        key={link.id}
                        href={`/folder/${link.folder_id}?note=${link.id}`}
                        className="block p-3 rounded-md border bg-muted/50 hover:bg-muted transition-colors"
                    >
                        <div className="font-medium text-sm">{link.title}</div>
                        <div className="text-xs text-muted-foreground">in {link.folder_name}</div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
