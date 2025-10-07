"use client"

import { Button } from "@/components/ui/button"
import { useEffect } from "react"

interface DeleteConfirmationDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    itemName?: string
    isLoading?: boolean
}

export function DeleteConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    itemName,
    isLoading = false
}: DeleteConfirmationDialogProps) {
    const handleConfirm = () => {
        onConfirm()
    }

    const handleCancel = () => {
        onClose()
    }

    // Handle ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            // Prevent body scroll
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, isLoading, onClose])

    if (!isOpen) {
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 animate-in fade-in-0"
                onClick={() => !isLoading && onClose()}
            />

            {/* Modal Content */}
            <div className="relative bg-background border rounded-lg shadow-lg p-6 w-full max-w-lg mx-4 animate-in zoom-in-95 slide-in-from-bottom-2">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                        {itemName && (
                            <div className="font-medium text-foreground">
                                &quot;{itemName}&quot;
                            </div>
                        )}
                        <div className="text-red-600 dark:text-red-400 font-medium text-sm">
                            This action cannot be undone.
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isLoading ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}