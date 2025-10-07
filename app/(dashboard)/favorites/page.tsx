"use client";

import { useFavoriteNotesQuery } from '@/lib/queries';
import { useDashboardStore } from '@/lib/store';
import { NoteContent } from '@/components/notes/note-content';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export default function FavoritesPage() {
    const { data: favorites, isLoading } = useFavoriteNotesQuery();
    const { activeNoteId, setActiveNoteId, setActiveFolderId, resetSelection } = useDashboardStore();

    // Reset selection when navigating to favorites page
    useEffect(() => {
        resetSelection();
    }, [resetSelection]);

    const handleNoteSelect = (noteId: string, folderId: string) => {
        setActiveFolderId(folderId);
        setActiveNoteId(noteId);
    };

    return (
        <div className="flex h-full">
            {/* Left Pane: Favorites List */}
            <div className="w-80 bg-card border-r overflow-y-auto h-full transition-colors duration-200 flex-shrink-0">
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <h2 className="text-lg font-semibold">Favorites</h2>
                    </div>
                    {isLoading && <p>Loading favorites...</p>}
                    {!isLoading && (!favorites || favorites.length === 0) && (
                        <div className="text-center text-muted-foreground py-8 px-4">
                            <Star className="h-12 w-12 mx-auto text-muted mb-4" />
                            <p className="text-lg font-medium mb-2">No favorites yet</p>
                            <p className="text-sm leading-relaxed">Star notes to add them to your favorites</p>
                        </div>
                    )}
                    <div className="space-y-1">
                        {favorites?.map(note => (
                            <button
                                key={note.id}
                                onClick={() => handleNoteSelect(note.id, note.folder_id)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg transition-colors group",
                                    activeNoteId === note.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm mb-1 truncate">{note.title}</h3>
                                        <p className="text-xs text-muted-foreground">{note.folder_name}</p>
                                    </div>
                                    <Star className="h-3 w-3 text-yellow-500 fill-current ml-2 flex-shrink-0" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Pane: Note Content */}
            <div className="flex-1 bg-card h-full flex flex-col transition-colors duration-200 min-w-0">
                {activeNoteId ? (
                    <NoteContent
                        folderId={favorites?.find(n => n.id === activeNoteId)?.folder_id || ''}
                        noteId={activeNoteId}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full w-full">
                        <div className="text-center px-8 max-w-md">
                            <p className="text-muted-foreground text-sm leading-relaxed">Choose a favorite note from the left to view its content.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


