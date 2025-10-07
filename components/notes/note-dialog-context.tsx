"use client"

import { createContext, ReactNode, useContext, useState } from 'react'

interface QuestionDialogContextType {
    openQuestionDialog: (noteId: string) => void
    closeDialog: () => void
    noteId: string | null
    isOpen: boolean
}

const QuestionDialogContext = createContext<QuestionDialogContextType | undefined>(undefined)

export function QuestionDialogProvider({ children }: { children: ReactNode }) {
    const [noteId, setNoteId] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    const openQuestionDialog = (id: string) => {
        setNoteId(id)
        setIsOpen(true)
    }

    const closeDialog = () => {
        setIsOpen(false)
        setNoteId(null)
    }

    return (
        <QuestionDialogContext.Provider value={{
            openQuestionDialog,
            closeDialog,
            noteId,
            isOpen,
        }}>
            {children}
        </QuestionDialogContext.Provider>
    )
}

export function useQuestionDialog() {
    const context = useContext(QuestionDialogContext)
    if (context === undefined) {
        throw new Error('useQuestionDialog must be used within a QuestionDialogProvider')
    }
    return context
}
