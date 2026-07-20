import { Socket } from "socket.io";

interface SelectionData {
    documentId: string,
    range: {index: number; length: number } | null,
    user: {
        id: string;
        name: string;
        color: string;
    }
};

export function registerPresenceHandlers(socket: Socket) {
    // Listen to the event move mouse pointer and highlight text
    socket.on('selection-change', (data: SelectionData) => {
        // Emit the event to other users
        socket.to(data.documentId).emit('selection-change', {
            range: data.range,
            user: data.user,
            socketId: socket.id,
        });
    });
}