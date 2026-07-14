const API_URL = process.env.API_URL;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = (typeof window !== "undefined") ? localStorage.getItem("token") : null;

    const headers = {
        'ContentType': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || response.statusText);
    }

    return response.json();
}