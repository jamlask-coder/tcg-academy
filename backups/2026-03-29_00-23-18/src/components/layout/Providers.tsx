"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { DiscountProvider } from "@/context/DiscountContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DiscountProvider>
          <CartProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </CartProvider>
        </DiscountProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
