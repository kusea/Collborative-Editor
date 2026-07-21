// frontend/app/documents/[id]/components/AISidebar.tsx
"use client";

import React, { useState } from "react";
import { Editor } from "@tiptap/react";
import {MessageSquare, X, ChevronDown, ChevronRight, Send, Sparkles, FileText, Check, Loader2} from "lucide-react";
import { apiFetch } from "../../../utils/api";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    thinking?: string;
    suggestedText?: string;
    applied?: boolean;
}

interface AISidebarProps {
    editor: Editor | null;
}

export const AISidebar: React.FC<AISidebarProps> = ({ editor }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputPrompt, setInputPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [showThinking, setShowThinking] = useState<Record<string, boolean>>({});
    const [messages, setMessages] = useState<Message[]>([]);

    // Lấy văn bản đang bôi đen nếu có
    const getSelectedText = () => {
        if (!editor) return "";
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, " ");
    };

    const handleSendPrompt = async (customPrompt?: string, actionType: string = "custom") => {
        const promptToUse = customPrompt || inputPrompt;
        if (!promptToUse.trim()) return;

        const selectedText = getSelectedText();
        const userMsgId = Date.now().toString();

        // 1. Thêm message người dùng vào khung chat
        const userMessage: Message = {
            id: userMsgId,
            role: "user",
            content: promptToUse + (selectedText ? `\n\n*(Context: "${selectedText.slice(0, 50)}...")*` : ""),
        };

        setMessages((prev) => [...prev, userMessage]);
        if (!customPrompt) setInputPrompt("");
        setLoading(true);

        try {
        // Gọi API Backend
            const data = await apiFetch("/ai/edit", {
                method: "POST",
                body: JSON.stringify({
                    text: selectedText || editor?.getText(),
                    action: actionType,
                    prompt: promptToUse,
                }),
            });

            if (data?.result) {
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: data.result,
                    thinking: data.thinking || "Processed context and generated text according to instruction.",
                    suggestedText: data.result,
                };
                setMessages((prev) => [...prev, aiMsg]);
            }
        } catch (err) {
        console.error("AI Request Failed:", err);
        } finally {
        setLoading(false);
        }
    };

    // Áp dụng đoạn văn mới vào Editor kèm Highlight vệt màu
    const handleApplyToEditor = (msgId: string, text: string) => {
        if (!editor) return;

        const { selection } = editor.state;
        const { from, to } = selection;

        if (from !== to) {
        // Replace selection with new text
        editor.chain().focus().insertContentAt(
            { from, to },
            [{
                type: "text",
                text: text,
                marks: [{ type: "highlight", attrs: { color: "#dcfce7" } }],
            },]).run();
        } else {
        // Insert text at cursor
        editor.chain().focus().insertContent({
            type: "text",
            text: "\n" + text,
            marks: [{ type: "highlight", attrs: { color: "#dcfce7" } }],
        }).run();
        }

        // Đánh dấu câu trả lời đã được chèn
        setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m))
        );
    };

    const toggleThinking = (id: string) => {
        setShowThinking((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <>
        {/* 1. Chat Button when AI sidebar is closed */}
        {!isOpen && (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center cursor-pointer"
                title="Open AI Assistant"
            >
            <MessageSquare className="h-6 w-6" />
            </button>
        )}

        {/* 2. Chat Sidebar Panel */}
        {isOpen && (
            <aside className="fixed top-0 right-0 h-screen w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-all">
            {/* Header Sidebar */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h2 className="font-semibold text-slate-800 text-sm">AI Assistant</h2>
                </div>
                <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-md text-slate-500 transition"
                >
                <X className="h-5 w-5" />
                </button>
            </div>

            {/* Chat Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                    <p>No messages yet.</p>
                    <p className="text-xs mt-1">Select text or type a prompt below.</p>
                </div>
                ) : (
                messages.map((msg) => (
                    <div
                    key={msg.id}
                    className={`flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                    }`}
                    >
                        <div
                            className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm ${
                            msg.role === "user"
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-800 border border-slate-200"
                            }`}
                        >
                            {/* Collapsible Thinking Section */}
                            {msg.thinking && (
                            <div className="mb-2 border-b border-slate-200 pb-2">
                                <button
                                onClick={() => toggleThinking(msg.id)}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"
                                >
                                {showThinking[msg.id] ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                )}
                                Thinking process
                                </button>
                                {showThinking[msg.id] && (
                                <div className="mt-1 text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-200">
                                    {msg.thinking}
                                </div>
                                )}
                            </div>
                            )}

                            <div className="whitespace-pre-wrap">{msg.content}</div>

                            {/* Action button to insert to Editor */}
                            {msg.suggestedText && (
                            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-end">
                                <button
                                onClick={() => handleApplyToEditor(msg.id, msg.suggestedText!)}
                                disabled={msg.applied}
                                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition ${
                                    msg.applied
                                    ? "bg-emerald-100 text-emerald-700 cursor-default"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                }`}
                                >
                                {msg.applied ? (
                                    <>
                                        <Check className="h-3 w-3" /> Inserted
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-3 w-3" /> Insert to Editor
                                    </>
                                )}
                                </button>
                            </div>
                            )}
                        </div>
                    </div>
                )))}

                {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    AI is thinking...
                </div>
                )}
            </div>

            {/* Footer Input & Quick Options */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
                {/* Quick Suggestions (Chức năng cũ chuyển thành gợi ý) */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                    onClick={() => handleSendPrompt("Continue writing this document", "continue")}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 rounded-full text-slate-600 transition whitespace-nowrap"
                >
                    <Sparkles className="h-3 w-3 text-indigo-500" /> Write More
                </button>
                <button
                    onClick={() => handleSendPrompt("Summarize the text", "summarize")}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 rounded-full text-slate-600 transition whitespace-nowrap"
                >
                    <FileText className="h-3 w-3 text-emerald-500" /> Summarize
                </button>
                </div>

                {/* Prompt Input Box */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendPrompt()}
                    placeholder="Ask AI anything..."
                    className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
                />
                <button
                    onClick={() => handleSendPrompt()}
                    disabled={loading || !inputPrompt.trim()}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition"
                >
                    <Send className="h-4 w-4" />
                </button>
                </div>
            </div>
            </aside>
        )}
        </>
    );
};