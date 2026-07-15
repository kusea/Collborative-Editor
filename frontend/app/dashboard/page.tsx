import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../utils/api";
import { FileText, Plus, LogOutIcon, Loader2 } from "lucide-react";

interface DocumentItem {
    _id: string;
    title: string;
    updatedAt: string;
}

export default function Dashboard() {
    const [docs, setDocs] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [user, setUser] = useState<{ username: string } | null>(() => {
        const storedUser =
            typeof window !== "undefined" ? localStorage.getItem("user") : null;
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const router = useRouter();

    const fetchDocuments = async () => {
        await apiFetch("/documents")
            .then((response) => setDocs(response.data))
            .catch(() => setDocs([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/auth");
            return;
        }

        fetchDocuments();
    }, [router]);

    const handleCreateDocuments = async () => {
        setCreating(true);
        const title =
            prompt("Enter new document title:") || "Untitled Document";
        await apiFetch("/documents", {
            method: "POST",
            body: JSON.stringify({ title }),
        })
            .then((response) => setDocs([response.data, ...docs]))
            .catch((error) => {
                alert(`Failed to create document: ${error.message}`);
            })
            .finally(() => setCreating(false));
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/auth");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-indigo-600" /> AI-powered RAG
                    System
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600">
                        Hello,{" "}
                        <strong className="text-slate-800">
                            {user?.username}
                        </strong>
                    </span>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red transition">
                        <LogOutIcon className="h-5 w-5" />
                    </button>
                </div>
            </header>
            <main className="max-w-5xl mx-auto px-6 py-10">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-slate-800">
                            My Documents
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Store all of your documents
                        </p>
                    </div>

                    <button
                        onClick={handleCreateDocuments}
                        disabled={creating}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow transition disabled:opacity-50">
                        {creating ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                            <Plus size={16} />
                        )}
                        Create new document
                    </button>

                    {docs.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
                            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-700">
                                You don&apos;t have any documents
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Get started by creating a new document
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                            {docs.map((doc) => (
                                <div
                                    key={doc._id}
                                    className="bg-white border border-slate-200 rounded-xl">
                                    <div className="p-4">
                                        <div className="p-2 bg-indigo-50 rounded-lg w-fit text-indigo-600 mb-4">
                                            <FileText size={20} />
                                        </div>
                                        <h3 className="font-semibold text-slate-800 text-lg truncate mb-1">
                                            {doc.title}
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Updating:{" "}
                                            {new Date(
                                                doc.updatedAt,
                                            ).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 text-right">
                                        <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
                                            Open document →
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
