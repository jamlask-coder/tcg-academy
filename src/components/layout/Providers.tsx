"use client";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { DiscountProvider } from "@/context/DiscountContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ToastProvider } from "@/context/ToastContext";
import { ScrollToTop } from "./ScrollToTop";
import { SystemGuard } from "@/components/SystemGuard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <DiscountProvider>
          <CartProvider>
            <NotificationProvider>
              <ToastProvider>
              <ScrollToTop />
              <SystemGuard />
              {children}
            </ToastProvider>
            </NotificationProvider>
          </CartProvider>
        </DiscountProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
