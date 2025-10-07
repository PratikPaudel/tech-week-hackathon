"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { useCreateVersionMutation } from '@/lib/queries';
import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface AddVersionFormProps {
    noteId: string;
    onSuccess?: () => void;
}

export function AddVersionForm({ noteId, onSuccess }: AddVersionFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState('');
    const [comment, setComment] = useState('');
    const [versionTags, setVersionTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);

    const createVersion = useCreateVersionMutation(noteId);

    // Load draft on mount
    useEffect(() => {
        const draftKey = `draft_version_${noteId}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.content && !content && !comment) {
                    setContent(draft.content);
                    setComment(draft.comment || '');
                    setVersionTags(draft.versionTags || []);
                    toast.info('Restored previous draft');
                }
            } catch (error) {
                console.error('Failed to load draft:', error);
            }
        }
    }, [noteId, content, comment]);

    const handleAutoSave = (content: string) => {
        // Save to localStorage as draft
        const draftKey = `draft_version_${noteId}`;
        localStorage.setItem(draftKey, JSON.stringify({
            content,
            comment,
            versionTags,
            timestamp: new Date().toISOString()
        }));
        setLastAutoSaved(new Date());
        toast.success('Draft saved automatically', { duration: 1000 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!content.trim()) {
            toast.error('Please provide content for the version');
            return;
        }

        if (!comment.trim()) {
            toast.error('Please provide a title for the version');
            return;
        }

        try {
            await createVersion.mutateAsync({
                note_id: noteId,
                content: content.trim(),
                version_label: comment.trim(),
                version_description: undefined,
                version_tags: versionTags,
                is_current: false, // Don't make new versions current by default
                is_default: false,
            });

            toast.success('New version added successfully!');
            
            // Clear draft and reset form
            const draftKey = `draft_version_${noteId}`;
            localStorage.removeItem(draftKey);
            setContent('');
            setComment('');
            setVersionTags([]);
            setTagInput('');
            setLastAutoSaved(null);
            setIsOpen(false);
            onSuccess?.();
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

    if (!isOpen) {
        return (
            <div className="mb-6">
                <Button 
                    onClick={() => setIsOpen(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add an Answer
                </Button>
            </div>
        );
    }

    return (
        <div className="border-t pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="new-content">New Version Content</Label>
                        {lastAutoSaved && (
                            <span className="text-xs text-muted-foreground">
                                Auto-saved at {lastAutoSaved.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    <RichTextEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Write your answer content..."
                        autoSave={{
                            onAutoSave: handleAutoSave,
                            delay: 2000
                        }}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="comment">Title <span className="text-red-500">*</span></Label>
                    <Input
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Title for this version..."
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tags">Tags (Optional)</Label>
                    <div className="flex gap-2">
                        <Input
                            id="tags"
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

                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createVersion.isPending || !content.trim() || !comment.trim()}
                    >
                        {createVersion.isPending ? 'Adding...' : 'Add Version'}
                    </Button>
                </div>
            </form>
        </div>
    );
}