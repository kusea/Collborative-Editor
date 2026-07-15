import { useState, ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../utils/api";

export default function Auth() {
    const [isLogin, setIsLogin] = useState(false);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit: ComponentProps<"form">["onSubmit"] = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const endpoint = isLogin ? "/auth/login" : "/auth/register";
            const body = isLogin
                ? { email, password }
                : { username, email, password };
            const data = await apiFetch(endpoint, {
                method: "POST",
                body: JSON.stringify(body),
            });

            localStorage.setItem("token", data.access_token);
            localStorage.setItem("user", JSON.stringify(data.user));

            router.push("/dashboard");
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("An unknown error occurred.");
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md border-slate-100">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">
                        {isLogin
                            ? "Login to your account"
                            : "Create a new account"}
                    </h2>
                    <p className="mt-2 text-center text-slate-500">
                        Collaborative Editor Document
                    </p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                        {error}
                    </div>
                )}

                <form
                    className="mt-8 space-y-4"
                    onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div>
                            <label className="text-sm font-semibold text-slate-700">
                                Username
                            </label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus: ring-indigo-500"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-semibold text-slate-700">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus: ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-700">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus: ring-indigo-500"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition duration-200">
                        {isLogin ? "Login" : "Register"}
                    </button>
                </form>

                <div className="text-center mt-4">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                        }}
                        className="text-sm text-indigo-600 hover:underline">
                        {isLogin
                            ? "Don't have an account? Register"
                            : "Already have an account? Login"}
                    </button>
                </div>
            </div>
        </div>
    );
}
