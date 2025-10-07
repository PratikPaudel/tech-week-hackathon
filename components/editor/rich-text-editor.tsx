"use client"

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSearchNotesByTitleQuery } from '@/lib/queries'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'
import {
    Bold,
    Code,
    Heading1,
    Heading2,
    Italic,
    Link,
    List,
    ListOrdered,
    Quote,
    Redo,
    Undo
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { WikiLink } from './wikilink-extension'

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

interface RichTextEditorProps {
    content: string
    onChange: (content: string) => void
    placeholder?: string
    autoSave?: {
        onAutoSave: (content: string) => void
        delay?: number
    }
}

export function RichTextEditor({ content, onChange, placeholder, autoSave }: RichTextEditorProps) {
    const [isMounted, setIsMounted] = useState(false)
    const [showWikiLinkDialog, setShowWikiLinkDialog] = useState(false)
    const [wikiLinkQuery, setWikiLinkQuery] = useState('')
    const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
    const [lastSavedContent, setLastSavedContent] = useState(content)
    const { data: searchResults } = useSearchNotesByTitleQuery(wikiLinkQuery)

    useEffect(() => {
        console.log('RichTextEditor: Component mounted')
        setIsMounted(true)

        // Cleanup auto-save timer on unmount
        return () => {
            if (autoSaveTimer) {
                clearTimeout(autoSaveTimer)
            }
        }
    }, [autoSaveTimer])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Disable the default codeBlock to avoid conflicts
                codeBlock: false,
            }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            WikiLink,
        ],
        content,
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML()
            onChange(newContent)

            // Auto-save functionality
            if (autoSave && newContent !== lastSavedContent) {
                // Clear existing timer
                if (autoSaveTimer) {
                    clearTimeout(autoSaveTimer)
                }

                // Set new timer
                const timer = setTimeout(() => {
                    autoSave.onAutoSave(newContent)
                    setLastSavedContent(newContent)
                }, autoSave.delay || 2000) // Default 2 seconds

                setAutoSaveTimer(timer)
            }
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
                'data-placeholder': placeholder || 'Start writing...',
            },
        },
        immediatelyRender: false,
        onCreate: () => {
            console.log('RichTextEditor: Editor created successfully')
        },
    })

    // Update editor content when the content prop changes
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    const insertWikiLink = (questionId: string, questionText: string, folderId: string) => {
        if (!editor) return

        editor
            .chain()
            .focus()
            .insertContent([
                {
                    type: 'wikiLink',
                    attrs: {
                        id: questionId,
                        label: questionText,
                        folderId: folderId,
                    },
                },
            ])
            .run()

        setShowWikiLinkDialog(false)
        setWikiLinkQuery('')
    }

    if (!isMounted || !editor) {
        console.log('RichTextEditor: Rendering placeholder, isMounted:', isMounted, 'editor:', !!editor)
        return (
            <div className="border rounded-md overflow-hidden">
                <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
                    {/* Placeholder toolbar */}
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="w-px h-6 bg-border mx-1" />
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="w-px h-6 bg-border mx-1" />
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="w-px h-6 bg-border mx-1" />
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="h-8 w-8 bg-muted rounded" />
                </div>
                <div className="min-h-[200px] p-4 bg-muted/20 animate-pulse" />
            </div>
        )
    }

    const ToolbarButton = ({
        onClick,
        isActive = false,
        children,
        title
    }: {
        onClick: () => void
        isActive?: boolean
        children: React.ReactNode
        title: string
    }) => (
        <Button
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={onClick}
            title={title}
            className="h-8 w-8 p-0"
        >
            {children}
        </Button>
    )

    return (
        <div className="border rounded-md overflow-hidden">
            {/* Toolbar */}
            <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Undo"
                >
                    <Undo className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Redo"
                >
                    <Redo className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-6 bg-border mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-6 bg-border mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-6 bg-border mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Quote"
                >
                    <Quote className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Code Block"
                >
                    <Code className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-6 bg-border mx-1" />

                <ToolbarButton
                    onClick={() => setShowWikiLinkDialog(true)}
                    title="Insert Wiki Link"
                >
                    <Link className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Wiki Link Dialog */}
            <Dialog open={showWikiLinkDialog} onOpenChange={setShowWikiLinkDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Insert Wiki Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Search for a note to link:</label>
                            <Input
                                type="text"
                                value={wikiLinkQuery}
                                onChange={(e) => setWikiLinkQuery(e.target.value)}
                                placeholder="Type to search notes..."
                                className="mt-1"
                                autoFocus
                            />
                        </div>

                        {searchResults && searchResults.length > 0 && (
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Select a note:</div>
                                {searchResults.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => insertWikiLink(item.id, item.title, item.folder_id)}
                                        className="block w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                                    >
                                        <div className="font-medium text-sm">{item.title}</div>
                                        <div className="text-xs text-muted-foreground">in {item.folder_name}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {wikiLinkQuery && (!searchResults || searchResults.length === 0) && (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                No notes found matching &quot;{wikiLinkQuery}&quot;
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Editor Content */}
            <EditorContent editor={editor} />
        </div>
    )
}
