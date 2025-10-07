"use client";

import { SortableFolderList } from '@/components/dashboard/sortable-folder-list';
import { SortableNoteList } from '@/components/dashboard/sortable-note-list';
import { NoteContent } from '@/components/notes/note-content';
import { useDashboardStore } from '@/lib/store';
export default function DashboardPage() {
    const { activeFolderId, activeNoteId } = useDashboardStore();

    return (
        <div className="flex h-full">
            {/* Pane 1: Folder List - Hidden on small screens when note selected */}
            <div className={`
                w-60 md:w-64 lg:w-72 xl:w-80
                ${activeNoteId ? 'hidden lg:block' : 'block'}
                bg-card border-r overflow-y-auto h-full transition-colors duration-200 flex-shrink-0
            `}>
                <SortableFolderList />
            </div>

            {/* Pane 2: Note List - Hidden on small screens when note selected */}
            <div className={`
                w-72 md:w-80 lg:w-80 xl:w-96
                ${activeNoteId ? 'hidden md:block' : 'block'}
                bg-muted/50 border-r overflow-y-auto h-full transition-colors duration-200 flex-shrink-0
            `}>
                {activeFolderId ? <SortableNoteList folderId={activeFolderId} /> : <EmptyState message="Select a folder to see its notes." />}
            </div>

            {/* Pane 3: Note Content - Full width on mobile when selected */}
            <div className="flex-1 bg-card h-full flex flex-col transition-colors duration-200 min-w-0">
                {activeNoteId ? <NoteContent folderId={activeFolderId!} noteId={activeNoteId} /> : <EmptyState message="Select a note to view its content." />}
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center h-full w-full">
            <div className="text-center px-8 max-w-sm">
                <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
            </div>
        </div>
    );
}