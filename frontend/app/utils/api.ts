const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers = {
        "Content-Type": "application/json",
        ...(token && token !== "undefined" && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    const formattedEndpoint = endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;

    const response = await fetch(`${API_URL}${formattedEndpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || response.statusText);
    }

    return response.json();
};
