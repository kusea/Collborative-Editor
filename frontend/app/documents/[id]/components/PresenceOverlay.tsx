'use client'; 

import React, { useEffect} from 'react';
import { Editor } from '@tiptap/react';
import { UserPresence } from '../hooks/usePresenceTrack';
import { PresencePluginKey } from '../extensions/PresenceExtension';

interface PresenceOverlayProps {
    remotePresences: Record<string, UserPresence>;
    editor: Editor | null; 
}

export const PresenceOverlay: React.FC<PresenceOverlayProps> = ({ remotePresences, editor }) => {
    useEffect(() => {
        if(!editor || editor.isDestroyed) return;

        // Push the Remote Presence State to the ProseMirror Transaction for Editor
        const tr = editor.state.tr;
        tr.setMeta(PresencePluginKey, remotePresences);
        editor.view.dispatch(tr);
    }, [editor, remotePresences])
    return null;
}