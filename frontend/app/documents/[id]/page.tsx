"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Loader2, Save, Wifi, WifiOff } from "lucide-react";
import { apiFetch } from "../../utils/api";

const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL?.replace("/api", "");

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function DocumentPage({ params }: PageProps) {
    // Un-wrap params của Next.js 16+
    const { id: docId } = use(params);
    const router = useRouter();

    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [docTitle, setDocTitle] = useState("Loading document...");

    // Cấu hình trình soạn thảo Tiptap
    const editor = useEditor({
        extensions: [StarterKit],
        content: "<p>Start typing content here...</p>",
        editorProps: {
            attributes: {
                class: "prose max-w-none focus:outline-none min-h-[400px] text-slate-800 p-4",
            },
        },
        immediatelyRender: true,
    });

    useEffect(() => {
        const socketConnect = async () => {
            const token = localStorage.getItem("token");
            if (!token || token === "undefined") {
                localStorage.removeItem("token");
                router.push("/auth");
                return;
            }

            // 1. Kết nối tới Socket Server kèm theo token JWT trong handshake
            const socketInstance: Socket = io(BACKEND_URL, {
                auth: { token: token },
                transports: ["websocket"],
            });

            socketInstance.on("connect", () => {
                setConnected(true);
                console.log("Connected to WebSocket Server ✅");

                // 2. Tham gia vào phòng của tài liệu cụ thể
                socketInstance.emit("join-document", docId);
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
                    `Reconnecting to WebSocket Server (attempt ${attempts})`);
            })

            socketInstance.on("reconnect_failed", () => {
                console.log("Reconnection to WebSocket Server Failed");
            })

            setSocket(socketInstance);
            setLoading(false);

            // Hủy kết nối khi Component Unmount
            return () => {
                socketInstance.disconnect();
            };
        };

        const fetchDocument = async() => {
            try {
                const response = await apiFetch("/documents");
                if (response && Array.isArray(response)) {
                    const currentDoc = response.find((doc) => doc.id === docId);
                    if (currentDoc) {
                        setDocTitle(currentDoc.title);
                        if (currentDoc.content && editor)
                            editor?.commands.setContent(currentDoc.content);
                    } else setDocTitle("Document not found");
                }
            } catch (error) {
                console.error("Error fetching document:", error);
            }
        }

        fetchDocument();
        socketConnect();
        
    }, [docId, router, editor]);

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

                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow transition">
                        <Save size={16} /> Save (Offline)
                    </button>
                </div>
            </header>

            {/* Document editor */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-125 overflow-hidden flex flex-col">
                    {/* Thanh công cụ định dạng đơn giản */}
                    <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex items-center gap-1 flex-wrap">
                        <button
                            onClick={() =>
                                editor?.chain().focus().toggleBold().run()
                            }
                            disabled={
                                !editor
                                    ?.can()
                                    .chain()
                                    .focus()
                                    .toggleBold()
                                    .run()
                            }
                            className={`px-3 py-1 text-sm font-bold rounded-md hover:bg-slate-200 transition ${editor?.isActive("bold") ? "bg-slate-300" : ""}`}>
                            B
                        </button>
                        <button
                            onClick={() =>
                                editor?.chain().focus().toggleItalic().run()
                            }
                            disabled={
                                !editor
                                    ?.can()
                                    .chain()
                                    .focus()
                                    .toggleItalic()
                                    .run()
                            }
                            className={`px-3 py-1 text-sm italic rounded-md hover:bg-slate-200 transition ${editor?.isActive("italic") ? "bg-slate-300" : ""}`}>
                            I
                        </button>
                        <button
                            onClick={() =>
                                editor?.chain().focus().toggleStrike().run()
                            }
                            disabled={
                                !editor
                                    ?.can()
                                    .chain()
                                    .focus()
                                    .toggleStrike()
                                    .run()
                            }
                            className={`px-3 py-1 text-sm line-through rounded-md hover:bg-slate-200 transition ${editor?.isActive("strike") ? "bg-slate-300" : ""}`}>
                            S
                        </button>
                    </div>

                    {/* Editor Content Area */}
                    <div className="flex-1">
                        <EditorContent editor={editor} />
                    </div>
                </div>
            </main>
        </div>
    );
}
