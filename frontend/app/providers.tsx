"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export default function Providers({children}: {children: ReactNode}) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries:{
                staleTime: 1000*60,
                refetchOnWindowFocus: false, // Prevent automaticallly refresh when switch tab
            }
        }
    }))

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}