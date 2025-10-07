"use client";

import { Button } from '@/components/ui/button';
import { useNoteVersionsQuery } from '@/lib/queries';
import { formatDistanceToNow } from 'date-fns';
import { Clock, FileText, Star, Eye, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface VersionHistoryProps {
    noteId: string;
}

export function VersionHistory({ noteId }: VersionHistoryProps) {
    const { data: versions, isLoading } = useNoteVersionsQuery(noteId);
    const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="border-t pt-6 mt-8">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Version History
                </h3>
                <div className="text-sm text-muted-foreground">Loading version history...</div>
            </div>
        );
    }

    if (!versions || versions.length <= 1) {
        // Don't show version history if there's only one version or no versions
        return null;
    }

    // Sort versions by created_at, newest first
    const sortedVersions = [...versions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Remove the current version from the history (it's already displayed above)
    const historyVersions = sortedVersions.filter(v => !v.is_current);

    if (historyVersions.length === 0) {
        return null;
    }

    const toggleVersionExpansion = (versionId: string) => {
        setExpandedVersion(expandedVersion === versionId ? null : versionId);
    };

    const switchToVersion = (versionId: string) => {
        // TODO: Implement version switching
        console.log('Switch to version:', versionId);
    };

    return (
        <div className="border-t pt-6 mt-8">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Version History
                <span className="text-sm font-normal text-muted-foreground">
                    ({historyVersions.length} previous version{historyVersions.length !== 1 ? 's' : ''})
                </span>
            </h3>
            
            <div className="space-y-4">
                {historyVersions.map((version) => (
                    <div 
                        key={version.id}
                        className="border rounded-lg p-4 bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                        {/* Version Header */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <h4 className="font-medium">
                                        {version.version_label || 'Untitled'}
                                    </h4>
                                    {version.is_default && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 rounded-full text-xs text-green-600 dark:text-green-400">
                                            <Star className="h-3 w-3" />
                                            Default
                                        </span>
                                    )}
                                </div>
                                
                                {version.version_description && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {version.version_description}
                                    </p>
                                )}
                                
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>
                                        {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                    </span>
                                    <span>
                                        {version.content_length ? `${version.content_length.toLocaleString()} chars` : 'No content'}
                                    </span>
                                    <span className="capitalize">
                                        {version.version_type}
                                    </span>
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
                            
                            <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleVersionExpansion(version.id)}
                                    className="gap-2"
                                >
                                    <Eye className="h-3 w-3" />
                                    {expandedVersion === version.id ? 'Hide' : 'View'}
                                </Button>
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => switchToVersion(version.id)}
                                    className="gap-2"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Switch
                                </Button>
                            </div>
                        </div>
                        
                        {/* Expanded Version Content */}
                        {expandedVersion === version.id && (
                            <div className="border-t pt-3 mt-3">
                                <div className="prose prose-sm max-w-none">
                                    <div 
                                        className="text-sm leading-relaxed bg-background rounded p-3 border"
                                        dangerouslySetInnerHTML={{ __html: version.content }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> Click &quot;View&quot; to see the full content of a previous version, or &quot;Switch&quot; to make it the current version.
            </div>
        </div>
    );
}