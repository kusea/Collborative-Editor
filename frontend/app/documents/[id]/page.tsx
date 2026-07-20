"use client";

import { useEffect, useState, use, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {EditorContent, Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Loader2, Save, Wifi, WifiOff, Italic, Bold, Underline } from "lucide-react";
import { apiFetch } from "../../utils/api";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";

import { usePresenceTracking } from "./hooks/usePresenceTrack";
import { PresenceOverlayProps } from "./components/PresenceOverlay";

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

    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [docTitle, setDocTitle] = useState<string>("");
    const editorRef = useRef<Editor | null>(null);
    const socketRef = useRef<Socket | null>(null);

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
        ],
        editorProps: {
            attributes: {
                class: "prose prose-sm m-5 focus:outline-none",
            },
        },
        immediatelyRender: false,
        onUpdate: () => {
            if (editor) {
                setIsBold(editor.isActive("bold"));
                setIsItalic(editor.isActive("italic"));
                setIsUnderline(editor.isActive("underline"));
            }
        },
        onSelectionUpdate: () => {
            if (editor) {
                setIsBold(editor.isActive("bold"));
                setIsItalic(editor.isActive("italic"));
                setIsUnderline(editor.isActive("underline"));
            }
        }
    })

    const currentUser = useMemo(
        () => ({
            id: localStorage.getItem("id") || "",
            name: localStorage.getItem("name") || "",
            color: localStorage.getItem("color") || "",
        }),
        []
    )

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || token === "undefined") {
            localStorage.removeItem("token");
            router.push("/auth");
            return;
        }

        // 1. Kết nối tới Socket Server kèm theo token JWT trong handshake
        const socketInstance = io(BACKEND_URL, {
            auth: { token: token },
            transports: ["websocket"],
        });
        socketRef.current = socketInstance;

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
            editorRef.current = null;
            if (socketInstance) {
                socketInstance.off("init-document-state");
                socketInstance.off("document-broadcast");
                socketInstance.disconnect();
            }
            socketRef.current = null;
        }
    }, [docId, router, ydoc]);

    /* const { remotePresences, emitSelectionChange } = usePresenceTracking(
        socketRef.current!,
        docId,
        currentUser
    ) */

    /* const handleSelect = () => {
        if (editorRef.current) {
            const start = editorRef.current.selectionStart;
        }
    } */

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
                        { !socketRef ? (
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
                    <div className="flex-1">
                        <EditorContent editor={editor} />
                    </div>
                </div>
            </main>}
        </div>
    );
}
