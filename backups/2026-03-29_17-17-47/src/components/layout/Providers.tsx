"use client";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { DiscountProvider } from "@/context/DiscountContext";
import { NotificationProvider } from "@/context/NotificationContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DiscountProvider>
        <CartProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </CartProvider>
      </DiscountProvider>
    </AuthProvider>
  );
}
