"use client";

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCreateVersionMutation } from '@/lib/queries';
import { useState } from 'react';
import { Layers, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface SaveVersionDialogProps {
    noteId: string;
    noteTitle: string;
    currentContent: string;
    trigger?: React.ReactNode;
}

export function SaveVersionDialog({ noteId, noteTitle, currentContent, trigger }: SaveVersionDialogProps) {
    const [open, setOpen] = useState(false);
    const [versionLabel, setVersionLabel] = useState('');
    const [versionDescription, setVersionDescription] = useState('');
    const [versionTags, setVersionTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [makeCurrent, setMakeCurrent] = useState(true);
    const [makeDefault, setMakeDefault] = useState(false);

    const createVersion = useCreateVersionMutation(noteId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!versionLabel.trim()) {
            toast.error('Please provide a title for the version');
            return;
        }

        try {
            await createVersion.mutateAsync({
                note_id: noteId,
                content: currentContent,
                version_label: versionLabel.trim(),
                version_description: versionDescription.trim() || undefined,
                version_tags: versionTags,
                is_current: makeCurrent,
                is_default: makeDefault,
            });

            toast.success(`Version "${versionLabel}" created successfully!`);
            
            // Reset form
            setVersionLabel('');
            setVersionDescription('');
            setVersionTags([]);
            setTagInput('');
            setMakeCurrent(true);
            setMakeDefault(false);
            setOpen(false);
        } catch (error) {
            toast.error('Failed to create version');
            console.error('Create version error:', error);
        }
    };

    const addTag = () => {
        if (tagInput.trim() && !versionTags.includes(tagInput.trim().toLowerCase())) {
            setVersionTags([...versionTags, tagInput.trim().toLowerCase()]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setVersionTags(versionTags.filter(t => t !== tag));
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    };

    const defaultTrigger = (
        <Button variant="outline" className="gap-2">
            <Layers className="h-4 w-4" />
            Save as New Version
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Create New Version
                    </DialogTitle>
                    <DialogDescription>
                        Save the current content as a new version for &quot;{noteTitle}&quot;
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="version-label">Title *</Label>
                        <Input
                            id="version-label"
                            value={versionLabel}
                            onChange={(e) => setVersionLabel(e.target.value)}
                            placeholder="e.g., Technical Deep-dive, Beginner Guide"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="version-description">Description</Label>
                        <Textarea
                            id="version-description"
                            value={versionDescription}
                            onChange={(e) => setVersionDescription(e.target.value)}
                            placeholder="What changed in this version?"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="version-tags">Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                id="version-tags"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                placeholder="Add tags..."
                                className="flex-1"
                            />
                            <Button 
                                type="button" 
                                onClick={addTag} 
                                variant="outline" 
                                size="sm"
                                disabled={!tagInput.trim()}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {versionTags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {versionTags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="ml-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="make-current"
                                checked={makeCurrent}
                                onChange={(e) => setMakeCurrent(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="make-current" className="cursor-pointer">
                                Make this the current version
                            </Label>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="make-default"
                                checked={makeDefault}
                                onChange={(e) => setMakeDefault(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <div>
                                <Label htmlFor="make-default" className="cursor-pointer">
                                    Set as default version
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    The version shown to new visitors
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createVersion.isPending || !versionLabel.trim()}
                        >
                            {createVersion.isPending ? 'Creating...' : 'Create Version'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}