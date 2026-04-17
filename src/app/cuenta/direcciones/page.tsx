"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DireccionesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cuenta/datos");
  }, [router]);
  return null;
}
