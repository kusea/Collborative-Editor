'use client'; 

import React, { useLayoutEffect, useState} from 'react';
import { Editor } from '@tiptap/react';
import { UserPresence } from '../hooks/usePresenceTrack';

interface PresenceOverlayProps {
    remotePresences: Record<string, UserPresence>;
    editor: Editor | null; 
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const PAGE_CONFIG = {
    paddingLeft: 48,
    paddingTop: 32,
    lineHeight: 24,
}

interface LineRect {
    top: number;
    left: number;
    height: number;
    width: number;
}
export const PresenceOverlay: React.FC<PresenceOverlayProps> = ({ remotePresences, editor, containerRef }) => {
    const [computedCursors, setComputedCursors] = useState<Array<{
        socketId: string;
        user: { name: string; color: string };
        cursor: {top: number; left: number; height: number;}
        selection: LineRect[];
        }>
    >([]);

    useLayoutEffect(() => {
        if (!editor || editor.isDestroyed || !containerRef.current) {
            setComputedCursors([]);
            return;
        }

        // Remove duplicate cursors of other users
        const uniquePresencesMap = Object.values(remotePresences).reduce<Record<string, UserPresence>>(
            (acc, presence) => {
                if (presence.user.id) acc[presence.user.id] = presence;
                return acc;
        }, {})

        const doc = editor.state.doc;
        const view = editor.view;
        const presencesList = Object.values(uniquePresencesMap);
        const maxPos = Math.max(0, doc.nodeSize - 2);
        const container = containerRef.current!;
        const containerRect = container.getBoundingClientRect();

        const calculated = presencesList.map((presence) => {
            if (!presence.range) return null;

            const { index, length } = presence.range;
            
            const fromPos = Math.min(Math.max(0, index), maxPos);
            const toPos = Math.min(Math.max(index + length, 0), maxPos);
            try {
                // Calculate the coordinates of the cursor based on the line and columns
                // Find the position (line/paragraph) of the cursor
                /* const $pos = doc.resolve(safePos);
                console.log(`Position of cursor: ${safePos}, line index: ${$pos.index()}, size of document: ${doc.content.size}`);
                
                // Take the start position of the line
                const lineStartPos = $pos.start();
                
                // 3. Number of column = position of cursor - start position of line
                const columnIndex = safePos - lineStartPos;
                console.log(`Line start position: ${lineStartPos}, column index: ${columnIndex}`); */

                // Take the pixel position based on Node DOM
                const endCoords = view.coordsAtPos(toPos);

                // Calculate relative offset to Container
                const cursorTop = endCoords.top - containerRect.top + container.scrollTop;
                const cursorLeft = endCoords.left - containerRect.left + container.scrollLeft;
                const cursorHeight = endCoords.bottom - endCoords.top || PAGE_CONFIG.lineHeight;

                // Calculate the selection highligt (only length > 0)
                const selection: LineRect[] = [];
                if (length > 0 && fromPos < toPos) {
                    let currentLineStart = fromPos;
                    let currentLineCoords = view.coordsAtPos(currentLineStart);

                    for (let pos = fromPos + 1; pos <= toPos; pos++) {
                        const posCoords = view.coordsAtPos(pos);

                        const isNewPageOrLine = Math.abs(currentLineCoords.top - posCoords.top) > 0;
                        const isEnd = pos === toPos;

                        if(isNewPageOrLine || isEnd) {
                            const lineEndPos = isNewPageOrLine ? pos - 1 : pos;
                            const lineEndCoords = view.coordsAtPos(lineEndPos);

                            const top = currentLineCoords.top - containerRect.top + container.scrollTop;
                            const left = currentLineCoords.left - containerRect.left + container.scrollLeft;
                            const height = currentLineCoords.bottom - lineEndCoords.top || PAGE_CONFIG.lineHeight;

                            const width = Math.max(lineEndCoords.left - currentLineCoords.left, 4);
                            selection.push({top, left, height, width});

                            currentLineStart = pos;
                            currentLineCoords = posCoords;
                        }
                    }
                }

                return {
                    socketId: presence.socketId,
                    user: presence.user,
                    cursor: { top: cursorTop, left: cursorLeft, height: cursorHeight },
                    selection: selection,
                };
            } catch (err) {
                console.error(`Error calculating cursor position: ${err}`);
                return null;
            }
        }).filter(Boolean) as Array<{
            socketId: string;
            user: { name: string; color: string };
            cursor: {top: number; left: number; height: number;}
            selection: LineRect[];
        }>;

        setComputedCursors(calculated);
    }, [remotePresences, editor, containerRef]);

    if (computedCursors.length === 0) return null;

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
        {computedCursors.map(({ socketId, user, cursor, selection }) => {
            const userColor = user.color || "#3b82f6";

            return (
                <React.Fragment key={socketId}>
                    {/* Selection highlight */}
                    {selection.length > 0 && selection.map((rect, idx) => (
                        <div
                            key={`${socketId}-rect-${idx}`}
                            className="absolute transition-all duration-75 rounded-xs pointer-events-none"
                            style={{
                            top: `${rect.top}px`,
                            left: `${rect.left}px`,
                            width: `${rect.width}px`,
                            height: `${rect.height}px`,
                            backgroundColor: userColor,
                            opacity: 0.25, // Màu mờ tự nhiên
                            }}
                        />
                    ))}
                    {/* Cursor and User badge*/}
                    <div
                        className = "absolute w-0.5 transition-all duration-100 ease-out pointer-events-none"
                        style = {{
                            top: `${cursor.top}px`,
                            left: `${cursor.left}px`,
                            height: `${cursor.height}px`,
                            backgroundColor: userColor,
                        }}
                    >
                        {/* Badge for user name */}
                        <div
                            className="absolute -top-5 left-0 text-[10px] font-medium text-white px-1.5 py-0.5 rounded-t-md rounded-br-md whitespace-nowrap shadow-sm flex items-center gap-1 select-none z-30"
                            style={{ backgroundColor: userColor }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {user.name}
                        </div>    
                    </div>
                </React.Fragment>
        )})}
        </div>
    );
}