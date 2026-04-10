"use client";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { DiscountProvider } from "@/context/DiscountContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ToastProvider } from "@/context/ToastContext";
import { ScrollToTop } from "./ScrollToTop";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DiscountProvider>
        <CartProvider>
          <NotificationProvider>
            <ToastProvider>
            <ScrollToTop />
            {children}
          </ToastProvider>
          </NotificationProvider>
        </CartProvider>
      </DiscountProvider>
    </AuthProvider>
  );
}
