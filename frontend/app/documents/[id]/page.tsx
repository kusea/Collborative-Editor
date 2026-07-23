"use client";

import { useEffect, useState, use, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Loader2, Save, Wifi, WifiOff, Italic, Bold, Underline, Share2 } from "lucide-react";
import { apiFetch } from "../../utils/api";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import Highlight from "@tiptap/extension-highlight";
import * as Y from "yjs";

import { usePresenceTracking } from "./hooks/usePresenceTrack";
import { PresenceOverlay } from "./components/PresenceOverlay";
import { AISidebar } from "./components/AISidebar";
import { ShareModal } from "./components/ShareModal";
import { PresenceExtension } from "./extensions/PresenceExtension";

const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL?.replace("/api", "");

interface PageProps {
    params: Promise<{ id: string }>;
}
const globalSymbols = new Map<string, Y.Doc>();
const getGlobalYDoc = (docId: string) => {
    if (!globalSymbols.has(docId)) globalSymbols.set(docId, new Y.Doc());
    return globalSymbols.get(docId)!;
};

export default function DocumentPage({ params }: PageProps) {
    // Un-wrap params của Next.js 16+
    const { id: docId } = use(params);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [docTitle, setDocTitle] = useState<string>("");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    // Initialize a Y.Doc Object for document through useRef
    const ydoc = getGlobalYDoc(docId);
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                undoRedo: false,
            }),
            Placeholder.configure({
                placeholder: "Type something...",
                emptyEditorClass: "is-editor-empty",
            }),
            Collaboration.configure({
                document: ydoc,
                field: "shared-content"
            }),
            Highlight.configure({
                multicolor: true
            }),
            PresenceExtension // Register extension into tiptap
        ],
        editorProps: {
            attributes: {
                class: "prose prose-sm focus:outline-none min-h-125 w-full",
            },
        },
        immediatelyRender: false,
        onUpdate: ({editor}) => {
            setIsBold(editor.isActive("bold"));
            setIsItalic(editor.isActive("italic"));
            setIsUnderline(editor.isActive("underline"));
            
        },
        onSelectionUpdate: ({editor}) => {
            setIsBold(editor.isActive("bold"));
            setIsItalic(editor.isActive("italic"));
            setIsUnderline(editor.isActive("underline"));
            const {from, to} = editor.state.selection;
            const index = from;
            const length = to - from;
            emitSelectionChange({index: index, length: length});
            
        }
    })

    const currentUser = useMemo(
        () => {
            if (typeof window === "undefined") {
                return { id: "", name: "Anonymous", color: "#3b82f6" };
            }
            return {
                id: localStorage.getItem("id") || "Guest-",
                name: localStorage.getItem("name") || "Guest User",
                color: localStorage.getItem("color") || "#8b5cf6",
            }
        },
        []
    );

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || token === "undefined") {
            localStorage.removeItem("token");
            router.push("/auth");
            return;
        }

        const createSocket = (token: string) => {
            const socket = io(BACKEND_URL, {
                auth: { token: token },
                transports: ["websocket"]
            });
            setSocket(socket);
            return socket;
        }
        // 1. Kết nối tới Socket Server kèm theo token JWT trong handshake
        const socketInstance = createSocket(token);
        
        socketInstance.on("connect", () => {
            setConnected(true);
            console.log("Connected to WebSocket Server ✅");

            // 2. Tham gia vào phòng của tài liệu cụ thể
            socketInstance?.emit("join-document", docId);
        });

        socketInstance.on("init-document-state", (update: ArrayBuffer) => {
            Y.applyUpdate(ydoc, new Uint8Array(update), "server-init");
        });

        socketInstance.on("document-broadcast", (update: ArrayBuffer) => {
            Y.applyUpdate(ydoc, new Uint8Array(update), "remote-update");
        });

        socketInstance.on("disconnect", () => {
            setConnected(false);
            console.log("Disconnected from WebSocket Server ❌");
        });

        socketInstance.on("connect_error", (err) => {
            console.error("Socket Connection Error:", err.message);
            // Nếu lỗi xác thực token, đẩy người dùng về trang đăng nhập
            if (err.message.includes("Authentication error")) {
                localStorage.removeItem("token");
                router.push("/auth");
            }
        });

        socketInstance.on("reconnect_attempt", (attempts) => {
            console.log(
                `Reconnecting to WebSocket Server (attempt ${attempts})`,
            );
        });

        socketInstance.on("reconnect_failed", () => {
            console.log("Reconnection to WebSocket Server Failed");
        });

        const handleYDocUpdate = (update: Uint8Array, origin: string) => {
            if (origin === "remote-update" || origin === "server-init") return;

            if (socketInstance && socketInstance.connected){ 
                socketInstance?.emit("update-document", {docId, update: update });
            }
        };
        ydoc.on("update", handleYDocUpdate);

        const fetchDocument = async() => {
            try {
                const response = await apiFetch("/documents");
                if (response && Array.isArray(response)) {
                    const currentDoc = response.find((doc) => doc._id === docId);
                    setDocTitle(currentDoc?.title || "");
                        // When use Collaboration, setContent will be managed by Server automatically resolved through "init-document-state"
                }
            } catch (error) {
                console.error("Error fetching document:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchDocument();
        
        return () => {
            ydoc.off("update", handleYDocUpdate);
            if (socketInstance) {
                socketInstance.off("init-document-state");
                socketInstance.off("document-broadcast");
                socketInstance.disconnect();
            }
            setSocket(null);
        }
    }, [docId, router, ydoc]);

    const { remotePresences, emitSelectionChange } = usePresenceTracking(
        socket,
        docId,
        currentUser
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header điều hướng */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {docTitle}
                        </h1>
                        <span className="text-xs text-slate-400">
                            ID: {docId}
                        </span>
                    </div>
                </div>

                {/* Status bar trạng thái kết nối WebSocket */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        { !socket ? (
                            <span className="text-rose-500 flex items-center gap-1">
                                <WifiOff className="h-4 w-4 animate-pulse" />{" "}
                                Internal Server Error ...
                            </span>
                        ) : connected ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                                <Wifi className="h-4 w-4" /> Connected
                            </span>
                        ) : (
                            <span className="text-rose-500 flex items-center gap-1">
                                <WifiOff className="h-4 w-4 animate-pulse" />{" "}
                                Disconnecting ...
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition cursor-pointer"
                    >
                        <Share2 size={16} /> Share
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow transition">
                        <Save size={16} /> Save (Offline)
                    </button>
                </div>
            </header>

            {/* Document editor */}
            {editor && 
            <main className="flex-1 max-w-4xl w-full mx-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-125 overflow-hidden flex flex-col text-black">
                    {/* Thanh công cụ định dạng đơn giản */}
                    <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex items-center gap-1 flex-wrap">
                        <button
                            onClick={() =>
                                editor.chain().focus().toggleBold().run()
                            }
                            className={`px-3 py-1 text-sm font-bold rounded-md hover:bg-slate-200 transition ${isBold ? "bg-slate-400" : ""}`}>
                            <Bold className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() =>
                                editor.chain().focus().toggleItalic().run()
                            }
                            className={`px-3 py-1 text-sm italic rounded-md hover:bg-slate-200 transition ${isItalic ? "bg-slate-400" : ""}`}>
                            <Italic className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() =>
                                editor.chain().focus().toggleUnderline().run()
                            }
                            className={`px-3 py-1 text-sm underline rounded-md hover:bg-slate-200 transition ${isUnderline ? "bg-slate-400" : ""}`}>
                            <Underline className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Editor Content Area */}
                    <div
                        ref={containerRef} 
                        className="relative w-full min-h-280 bg-white p-12 shadow-md border border-slate-200">
                        <PresenceOverlay 
                            remotePresences={remotePresences} 
                            editor = {editor}
                            containerRef={containerRef}
                        />
                        <AISidebar editor = {editor}/>
                        <EditorContent editor={editor}/>
                    </div>
                </div>
            </main>}

            {isShareModalOpen && 
            <ShareModal docId={docId} isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)}/>
            }
        </div>
    );
}
