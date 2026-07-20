'use client'; 

import React from 'react';

export interface UserPresence{
    socketId: string;
    user: {
        id: string;
        name: string;
        color: string
    };
    range: {
        index: number;
        length: number
    } | null;
    coords?: {
        top: number;
        left: number;
        height: number;
        width?: number;
    };
}

interface PresenceOverlayProps {
    remotePresences: Record<string, UserPresence>;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const PresenceOverlayProps: React.FC<PresenceOverlayProps> = ({ remotePresences}) => {
    const presences = Object.values(remotePresences);

    if (presences.length === 0) return null;

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
            {presences.map((presence) => {
                const { socketId, user, coords, range } = presence;

                if (!coords || !range) return null;

                const { top, left, height, width = 0} = coords;

                return (
                    <React.Fragment key = {socketId}>
                        {/* Highlight area if other clients are highlighting (length > 0) */}
                        {range.length > 0 && (
                            <div
                                className="absolute transition-all duration-75 rounded-sm opacity-35"
                                style={{
                                top: `${top}px`,
                                left: `${left}px`,
                                width: `${Math.max(width, 4)}px`,
                                height: `${height}px`,
                                backgroundColor: user.color || '#3b82f6',
                                }}
                            />
                            )}

                        {/* Blinking cursor and user badge/tag */}
                        <div className="absolute w-0.5 transition-all duration-100 ease-out"
                            style={{ 
                                top: `${top}px`, 
                                left: `${left + ((range.length > 0)? width : 0)}px`, 
                                height: `${height}px`, 
                                backgroundColor: user.color || '#3b82f6' }}
                            >
                                <div
                                    className="absolute -top-6 left-0 text-[11px] font-medium text-white px-1.5 py-0.5 rounded-t-md rounded-br-md whitespace-nowrap shadow-sm flex items-center gap-1 select-none pointer-events-auto transition-transform hover:scale-105"
                                    style={{ backgroundColor: user.color || '#3b82f6' }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    {user.name}
                                </div>
                            </div>
                    </React.Fragment>
                )
            })}
        </div>
    )
}