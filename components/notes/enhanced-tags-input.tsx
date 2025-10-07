"use client"

import { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface EnhancedTagsInputProps {
    value: string[];
    onChange: (next: string[]) => void;
    suggestions?: string[];
    placeholder?: string;
    editable?: boolean;
}

export function EnhancedTagsInput({ 
    value = [], 
    onChange, 
    suggestions = [],
    placeholder = "Add tag",
    editable = false 
}: EnhancedTagsInputProps) {
    const [input, setInput] = useState('');
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editInput, setEditInput] = useState('');
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (tag: string) => {
        const trimmedTag = tag.trim();
        if (!trimmedTag || value.includes(trimmedTag)) return;
        
        onChange([...value, trimmedTag]);
        setInput('');
        setOpen(false);
    };

    const removeTag = (tag: string) => {
        onChange(value.filter(t => t !== tag));
    };

    const startEditTag = (tag: string) => {
        if (!editable) return;
        setEditingTag(tag);
        setEditInput(tag);
    };

    const saveEditTag = () => {
        const trimmedTag = editInput.trim();
        if (!trimmedTag || !editingTag) {
            setEditingTag(null);
            return;
        }
        
        const newTags = value.map(t => t === editingTag ? trimmedTag : t);
        onChange(newTags);
        setEditingTag(null);
    };

    const filteredSuggestions = suggestions.filter(
        s => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase())
    );

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {value.map((tag) => (
                    <div
                        key={tag}
                        className="group relative inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {editingTag === tag ? (
                            <input
                                ref={inputRef}
                                className="bg-transparent outline-none min-w-[60px] max-w-[120px]"
                                value={editInput}
                                onChange={(e) => setEditInput(e.target.value)}
                                onBlur={saveEditTag}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveEditTag();
                                    } else if (e.key === 'Escape') {
                                        setEditingTag(null);
                                    }
                                }}
                                autoFocus
                            />
                        ) : (
                            <span
                                className={editable ? "cursor-pointer" : ""}
                                onClick={() => startEditTag(tag)}
                            >
                                {tag}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-red-500 dark:hover:text-red-400"
                            aria-label={`Remove ${tag} tag`}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}
                
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            {placeholder}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput
                                placeholder="Type a tag..."
                                value={input}
                                onValueChange={setInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && input.trim()) {
                                        e.preventDefault();
                                        addTag(input);
                                    }
                                }}
                            />
                            <CommandEmpty>
                                {input.trim() && (
                                    <button
                                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                        onClick={() => addTag(input)}
                                    >
                                        Create &quot;{input}&quot;
                                    </button>
                                )}
                            </CommandEmpty>
                            {filteredSuggestions.length > 0 && (
                                <CommandGroup>
                                    {filteredSuggestions.map((suggestion) => (
                                        <CommandItem
                                            key={suggestion}
                                            value={suggestion}
                                            onSelect={() => addTag(suggestion)}
                                        >
                                            {suggestion}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}