"use client";

import { Badge } from '@/components/ui/badge';
import { useAllTagsQuery, useNotesByTagQuery } from '@/lib/queries';
import { useDashboardStore } from '@/lib/store';
import { NoteContent } from '@/components/notes/note-content';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { Tag, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function TagsPage() {
    const { data: tags, isLoading: tagsLoading } = useAllTagsQuery();
    const { activeNoteId, setActiveNoteId, setActiveFolderId, resetSelection } = useDashboardStore();
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    
    // Reset selection when navigating to tags page
    useEffect(() => {
        resetSelection();
    }, [resetSelection]);
    
    const { data: taggedNotes, isLoading: notesLoading } = useNotesByTagQuery(selectedTag!);

    const handleNoteSelect = (noteId: string, folderId: string) => {
        setActiveFolderId(folderId);
        setActiveNoteId(noteId);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Two-Pane Layout for Tags with Resizable Columns */}
            <ResizablePanels 
                defaultWidths={["350px", "1fr"]} 
                minWidths={["250px", "400px"]}
                className="flex-1"
            >
                {/* Left Pane: Tags and Notes List */}
                <div className="bg-card border-r overflow-y-auto h-full transition-colors duration-200">
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Tag className="h-5 w-5 text-blue-500" />
                            <h2 className="text-lg font-semibold">Tags</h2>
                        </div>
                        
                        {/* Tags List */}
                        {tagsLoading && <p>Loading tags...</p>}
                        {!tagsLoading && (!tags || tags.length === 0) && (
                            <div className="text-center text-muted-foreground py-8 px-4">
                                <Hash className="h-12 w-12 mx-auto text-muted mb-4" />
                                <p className="text-lg font-medium mb-2">No tags yet</p>
                                <p className="text-sm leading-relaxed">Add tags to your notes to see them here</p>
                            </div>
                        )}
                        
                        <div className="space-y-2 mb-6">
                            {tags?.map((tagData) => (
                                <button
                                    key={tagData.tag}
                                    onClick={() => setSelectedTag(tagData.tag)}
                                    className={cn(
                                        "w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between",
                                        selectedTag === tagData.tag ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                    )}
                                >
                                    <span className="font-medium text-sm">#{tagData.tag}</span>
                                    <Badge variant="secondary" className="text-xs">
                                        {tagData.note_count}
                                    </Badge>
                                </button>
                            ))}
                        </div>

                        {/* Notes for Selected Tag */}
                        {selectedTag && (
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                                    Notes tagged &quot;{selectedTag}&quot;
                                </h3>
                                {notesLoading && <p className="text-sm text-muted-foreground">Loading notes...</p>}
                                <div className="space-y-1">
                                    {taggedNotes?.map(note => (
                                        <button
                                            key={note.id}
                                            onClick={() => handleNoteSelect(note.id, note.folder_id)}
                                            className={cn(
                                                "w-full text-left p-2 rounded-lg transition-colors",
                                                activeNoteId === note.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                                            )}
                                        >
                                            <div className="text-sm font-medium truncate">{note.title}</div>
                                            <div className="text-xs text-muted-foreground">{note.folder_name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Note Content */}
                <div className="bg-card h-full flex flex-col transition-colors duration-200">
                    {activeNoteId ? (
                        <NoteContent 
                            folderId={taggedNotes?.find(n => n.id === activeNoteId)?.folder_id || ''} 
                            noteId={activeNoteId} 
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full w-full">
                            <div className="text-center text-muted-foreground px-8 max-w-sm">
                                <Tag className="h-12 w-12 mx-auto text-muted mb-4" />
                                <p className="text-lg font-medium mb-2">Select a tag</p>
                                <p className="text-sm leading-relaxed">Choose a tag from the left to see its notes</p>
                            </div>
                        </div>
                    )}
                </div>
            </ResizablePanels>
        </div>
    );
}
