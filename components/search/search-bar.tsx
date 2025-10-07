"use client"

import { SearchFilter } from '@/components/search/search-filter'
import { Input } from '@/components/ui/input'
import { cleanupEmbeddings } from '@/lib/embeddings'
import { parseHtmlToReact } from '@/lib/html-utils'
import { useSearchNotesQuery, useVectorSearchQuery } from '@/lib/queries'
import { useAIStore } from '@/lib/store'
import { FileText, Search, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export function SearchBar() {
    const [q, setQ] = useState('')
    const [folderFilter, setFolderFilter] = useState<string | null>(null)
    const [tagFilter, setTagFilter] = useState<string[] | null>(null)
    // Debounced query string
    const [debounced, setDebounced] = useState('')
    const { data: keywordResults, isLoading: keywordLoading } = useSearchNotesQuery(debounced, folderFilter, tagFilter ?? null)
    const { data: semanticResults, isLoading: semanticLoading } = useVectorSearchQuery(debounced)
    const { status: aiStatus, progress: aiProgress } = useAIStore()
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isMetaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
            if (isMetaK) {
                e.preventDefault()
                inputRef.current?.focus()
            }
            if (e.key === 'Escape') {
                inputRef.current?.blur()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    // Cleanup embeddings when component unmounts
    useEffect(() => {
        return () => {
            cleanupEmbeddings()
        }
    }, [])

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebounced(q), 250)
        return () => clearTimeout(t)
    }, [q])

    return (
        <div className="relative w-full max-w-xl">
            <div className="relative flex items-center gap-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search your knowledge…"
                    className="pl-9 h-11 rounded-full shadow-sm"
                    aria-label="Search"
                />
                <SearchFilter onChange={({ folderId, tags }) => { setFolderFilter(folderId ?? null); setTagFilter(tags ?? null) }} />
            </div>
            {q && (aiStatus === 'loading' || keywordResults || semanticResults) ? (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md">
                    <div className="max-h-80 overflow-auto">
                        {/* AI Model Loading State */}
                        {q.trim().length > 2 && aiStatus === 'loading' && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    Initializing AI Search... ({Math.round(aiProgress)}%)
                                </div>
                            </div>
                        )}

                        {/* Active Searching State (only when AI is ready) */}
                        {q.trim().length > 2 && aiStatus === 'ready' && (keywordLoading || semanticLoading) && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    Searching...
                                </div>
                            </div>
                        )}

                        {/* AI Model Error State */}
                        {q.trim().length > 2 && aiStatus === 'error' && (
                            <div className="p-4 text-center text-sm text-red-600">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4">⚠️</div>
                                    AI Search unavailable. Using keyword search only.
                                </div>
                            </div>
                        )}

                        {/* Keyword Search Results */}
                        {!keywordLoading && keywordResults && keywordResults.length > 0 && (
                            <div className="border-b">
                                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-2">
                                    <FileText className="h-3 w-3" />
                                    Keyword Matches
                                </div>
                                <ul className="divide-y">
                                    {keywordResults.map((r) => (
                                        <li key={r.note_id} className="p-3 hover:bg-accent">
                                            <Link href={`/folder/${r.folder_id}?note=${r.note_id}`} className="block">
                                                <div className="font-medium line-clamp-1">
                                                    {parseHtmlToReact(r.snippet_title || r.title)}
                                                </div>
                                                {r.snippet_content || r.content ? (
                                                    <div className="text-xs text-gray-600 line-clamp-2">
                                                        {parseHtmlToReact(r.snippet_content || '')}
                                                    </div>
                                                ) : null}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Semantic Search Results */}
                        {!semanticLoading && semanticResults && semanticResults.length > 0 && (
                            <div>
                                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-2">
                                    <Sparkles className="h-3 w-3" />
                                    AI Semantic Matches
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {semanticResults.length} results • {Math.round(semanticResults[0]?.similarity * 100)}% match
                                    </span>
                                </div>
                                <ul className="divide-y">
                                    {semanticResults.map((r) => (
                                        <li key={r.id} className="p-3 hover:bg-accent">
                                            <Link href={`/folder/${r.folder_id}?note=${r.id}`} className="block">
                                                <div className="font-medium line-clamp-1">{r.title}</div>
                                                <div className="text-xs text-gray-600 line-clamp-2">{r.content}</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Similarity: {Math.round(r.similarity * 100)}%
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* No Results */}
                        {!keywordLoading && !semanticLoading &&
                            (!keywordResults || keywordResults.length === 0) &&
                            (!semanticResults || semanticResults.length === 0) &&
                            q.trim().length > 0 && aiStatus === 'ready' && (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No results found
                                </div>
                            )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}


