'use client'; 

import { useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

export interface UserPresence {
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
}

export const usePresenceTracking = (
    socket: Socket | null, 
    documentId: string, 
    currentUser: {
        id: string;
        name: string;
        color: string
    }
) => {
    const [remotePresences, setRemotePresences] = useState<Record<string, UserPresence>>({})

    useEffect(() => {
        if(!socket) return;

        // Listen the change event from others client
        socket.on('selection-change', (data: UserPresence) => {
            setRemotePresences((prevPresences) => ({
                ...prevPresences,
                [data.socketId]: data
            }));
        });

        // When there are users leaving the document room
        socket.on('user-disconnected', (socketId: string) => {
            setRemotePresences((prevPresences) => {
                const updatedPresences = { ...prevPresences };
                delete updatedPresences[socketId];
                return updatedPresences;
            })    
        });

        return () => {
            socket.off('selection-change');
            socket.off('user-disconnected');
        }
    }, [socket]);

    const emitSelectionChange = useCallback((range: {index: number; length: number} | null) => {
        if(!socket) return;
        socket.emit('selection-change', {documentId, range, user: currentUser});
    }, [socket, documentId, currentUser]);

    return {remotePresences, emitSelectionChange};
}