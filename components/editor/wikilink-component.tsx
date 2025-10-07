// Filename: components/editor/wikilink-component.tsx
"use client"

import { useQuestionDialog } from '@/components/notes/note-dialog-context'
import { NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react'

export const WikiLinkComponent = (props: ReactNodeViewProps) => {
    const { id, label } = props.node.attrs
    const { openQuestionDialog } = useQuestionDialog()

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        openQuestionDialog(id)
    }

    return (
        <NodeViewWrapper as="span" className="wiki-link-wrapper inline-block">
            <button
                onClick={handleClick}
                className="bg-muted text-foreground px-1 py-0.5 rounded-sm text-sm no-underline hover:bg-muted/80 transition-colors inline-block cursor-pointer border-none"
                contentEditable={false}
            >
                [[{label}]]
            </button>
        </NodeViewWrapper>
    )
}
