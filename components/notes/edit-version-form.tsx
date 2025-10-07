"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { useUpdateVersionMutation } from '@/lib/queries';
import { NoteVersion } from '@/lib/types/versioning';
import { useState } from 'react';
import { Save, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface EditVersionFormProps {
    version: NoteVersion;
    noteId: string;
    onCancel: () => void;
    onSuccess?: () => void;
}

export function EditVersionForm({ version, noteId, onCancel, onSuccess }: EditVersionFormProps) {
    const [content, setContent] = useState(version.content);
    const [comment, setComment] = useState(version.version_label || '');
    const [versionTags, setVersionTags] = useState<string[]>(version.version_tags || []);
    const [tagInput, setTagInput] = useState('');

    const updateVersion = useUpdateVersionMutation(noteId);

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
            await updateVersion.mutateAsync({
                id: version.id,
                content: content.trim(),
                version_label: comment.trim(),
                version_description: undefined,
                version_tags: versionTags,
                is_current: version.is_current,
                is_default: version.is_default,
            });

            toast.success('Version updated successfully!');
            onSuccess?.();
        } catch (error) {
            toast.error('Failed to update version');
            console.error('Update version error:', error);
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

    return (
        <div className="border-t mt-3 pt-3">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-content">Version Content</Label>
                    <RichTextEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Edit version content..."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-comment">Title <span className="text-red-500">*</span></Label>
                    <Input
                        id="edit-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Title for this version..."
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-tags">Tags</Label>
                    <div className="flex gap-2">
                        <Input
                            id="edit-tags"
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
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={updateVersion.isPending || !content.trim() || !comment.trim()}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {updateVersion.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}