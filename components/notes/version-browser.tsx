"use client";

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useNoteVersionsQuery } from '@/lib/queries';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Edit, Check, Clock, Layers, FileText } from 'lucide-react';
import { useState } from 'react';

interface VersionBrowserProps {
    noteId: string;
    noteTitle: string;
    versionCount: number;
    trigger?: React.ReactNode;
}

export function VersionBrowser({ noteId, noteTitle, versionCount, trigger }: VersionBrowserProps) {
    const { data: versions, isLoading } = useNoteVersionsQuery(noteId);
    const [open, setOpen] = useState(false);

    const defaultTrigger = (
        <Button variant="outline" size="sm" className="gap-2">
            <Layers className="h-4 w-4" />
            {versionCount} versions
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Versions for &quot;{noteTitle}&quot;
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-auto">
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-sm text-muted-foreground">Loading versions...</div>
                        </div>
                    )}
                    
                    {!isLoading && versions && versions.length === 0 && (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-sm text-muted-foreground">No versions found</div>
                        </div>
                    )}
                    
                    {!isLoading && versions && versions.length > 0 && (
                        <div className="space-y-3">
                            {versions.map((version) => (
                                <div
                                    key={version.id}
                                    className={`border rounded-lg p-4 transition-colors ${
                                        version.is_current 
                                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                                            : 'hover:bg-muted/50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                {version.is_current && (
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                                                        <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                            Current
                                                        </span>
                                                    </div>
                                                )}
                                                {version.is_default && (
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/40 rounded-full">
                                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                            Default
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="mb-2">
                                                <h3 className="font-medium text-foreground">
                                                    {version.version_label || 'Untitled'}
                                                </h3>
                                                {version.version_description && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {version.version_description}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                                </div>
                                                <div>
                                                    {version.content_length ? `${version.content_length} chars` : 'No content'}
                                                </div>
                                                <div className="capitalize">
                                                    {version.version_type}
                                                </div>
                                            </div>
                                            
                                            {version.version_tags && version.version_tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {version.version_tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-300"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => {
                                                    // TODO: Implement view version
                                                    console.log('View version:', version.id);
                                                }}
                                            >
                                                <Eye className="h-3 w-3" />
                                                View
                                            </Button>
                                            
                                            {!version.is_current && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => {
                                                        // TODO: Implement switch to version
                                                        console.log('Switch to version:', version.id);
                                                    }}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                    Switch
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="border-t pt-4 flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        {versions ? versions.length : 0} version{versions && versions.length !== 1 ? 's' : ''} total
                    </div>
                    <Button
                        onClick={() => {
                            // TODO: Implement create new version
                            console.log('Create new version for note:', noteId);
                        }}
                        className="gap-2"
                    >
                        <Layers className="h-4 w-4" />
                        Create Version
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}