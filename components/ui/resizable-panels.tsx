"use client";

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelsProps {
    children: ReactNode[];
    defaultWidths?: string[]; // CSS width values like "280px", "300px", "1fr"
    minWidths?: string[]; // Minimum widths in px
    className?: string;
}

export function ResizablePanels({ 
    children, 
    defaultWidths = ["300px", "350px", "600px"], 
    minWidths = ["200px", "250px", "400px"],
    className 
}: ResizablePanelsProps) {
    const [widths, setWidths] = useState<string[]>(defaultWidths);
    const [isDragging, setIsDragging] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [startMouseX, setStartMouseX] = useState<number>(0);
    const [startWidths, setStartWidths] = useState<number[]>([]);

    const parseWidth = (width: string): number => {
        if (width === '1fr' || width.includes('fr')) {
            return 400; // fallback width for flex
        }
        return parseInt(width.replace('px', ''));
    };

    const handleMouseDown = useCallback((resizerIndex: number, e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(resizerIndex);
        setStartMouseX(e.clientX);
        
        // Convert current widths to pixels for calculation
        const currentWidths = widths.map(parseWidth);
        setStartWidths(currentWidths);
    }, [widths]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging === null || !containerRef.current) return;

        const deltaX = e.clientX - startMouseX;
        const leftPanelIndex = isDragging;
        const rightPanelIndex = isDragging + 1;

        setWidths(prevWidths => {
            const newWidths = [...prevWidths];
            const minLeft = parseInt(minWidths[leftPanelIndex]?.replace('px', '') || '200');
            const minRight = parseInt(minWidths[rightPanelIndex]?.replace('px', '') || '200');

            // Calculate new widths
            const newLeftWidth = Math.max(minLeft, startWidths[leftPanelIndex] + deltaX);
            const newRightWidth = Math.max(minRight, startWidths[rightPanelIndex] - deltaX);

            // Only update if both panels respect minimum widths
            if (newLeftWidth >= minLeft && newRightWidth >= minRight) {
                newWidths[leftPanelIndex] = `${newLeftWidth}px`;
                newWidths[rightPanelIndex] = `${newRightWidth}px`;
            }

            return newWidths;
        });
    }, [isDragging, startMouseX, startWidths, minWidths]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(null);
    }, []);

    // Effect to handle global mouse events during dragging
    useEffect(() => {
        if (isDragging !== null) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div ref={containerRef} className={cn("flex h-full", className)}>
            {children.map((child, index) => (
                <div key={index} className="flex">
                    {/* Panel */}
                    <div 
                        style={{ 
                            width: widths[index] === '1fr' ? undefined : widths[index],
                            flex: widths[index] === '1fr' ? '1 1 0' : undefined,
                            flexShrink: widths[index] === '1fr' ? 1 : 0,
                            flexGrow: widths[index] === '1fr' ? 1 : 0
                        }}
                        className="overflow-hidden"
                    >
                        {child}
                    </div>
                    
                    {/* Resizer (don't render after the last panel) */}
                    {index < children.length - 1 && (
                        <div
                            className="w-1 bg-border hover:bg-border/80 cursor-col-resize relative group transition-colors flex-shrink-0"
                            onMouseDown={(e) => handleMouseDown(index, e)}
                        >
                            {/* Invisible wider area for easier grabbing */}
                            <div className="absolute inset-y-0 -left-1 -right-1 w-3" />
                            
                            {/* Visual indicator on hover */}
                            <div className="absolute inset-y-0 left-0 w-full bg-blue-500 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}