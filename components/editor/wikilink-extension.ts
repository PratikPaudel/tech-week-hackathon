// Filename: components/editor/wikilink-extension.ts
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { WikiLinkComponent } from './wikilink-component'

export const WikiLink = Node.create({
    name: 'wikiLink',
    group: 'inline',
    inline: true,
    atom: true, // Make it an atom since it's a single unit
    selectable: true,
    draggable: true,

    addAttributes() {
        return {
            id: { default: null, parseHTML: e => e.getAttribute('data-id'), renderHTML: attrs => ({ 'data-id': attrs.id }) },
            label: { default: null, parseHTML: e => e.getAttribute('data-label'), renderHTML: attrs => ({ 'data-label': attrs.label }) },
            folderId: { default: null, parseHTML: e => e.getAttribute('data-folder-id'), renderHTML: attrs => ({ 'data-folder-id': attrs.folderId }) },
        }
    },

    parseHTML() {
        return [{ tag: 'span[data-type="wiki-link"]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'wiki-link' })]
    },

    addNodeView() {
        return ReactNodeViewRenderer(WikiLinkComponent)
    },
})
