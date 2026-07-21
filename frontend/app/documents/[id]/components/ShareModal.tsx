'use client';

import React, {useState, ComponentProps} from "react";
import {X, UserPlus, Loader2, CheckCircle, AlertCircle} from "lucide-react";
import { apiFetch } from "../../../utils/api";

interface ShareModalProps {
    docId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ docId, isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{type: "success" | "error"; msg: string} | null>(null);

    if (!isOpen) return null;

    const handleShare: ComponentProps<"form">["onSubmit"] = async (e) => {
        e.preventDefault()
        if (!email.trim()) return;

        setLoading(true);
        setStatus(null); // Reset status

        try {
            const response = await apiFetch(`/documents/${docId}/share`, {
                method: 'POST',
                body: JSON.stringify({ email }),
            }); // Use docId instead of docId

            if(response?.message){
                setStatus({type: "success", msg: `Successfully shared document with ${email}`});
                setEmail('');
            } else {
                setStatus({type: "error", msg: response?.error || `Failed to share document with ${email}`});
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            setStatus({type: "error", msg: message || "Failed to share document with the provided email"});
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <UserPlus className="h-5 w-5" />
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-slate-800 text-base">Share Document</h3>
                        <p className="text-xs text-slate-400">Invite others to edit together in real-time</p>
                    </div>
                </div>

                <form onSubmit={handleShare} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                        User Email
                        </label>
                        <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {status && (
                        <div
                            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                            status.type === "success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                        >
                            {status.type === "success" ? (
                                <CheckCircle className="h-4 w-4 shrink-0" />
                            ) : (
                                <AlertCircle className="h-4 w-4 shrink-0" />
                            )}
                            <span>{status.msg}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                        >
                        Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow transition"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Share
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

}