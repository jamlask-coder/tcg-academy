"use client";

/**
 * Editor visual de plantilla de factura.
 * Controles en el panel izquierdo, preview en vivo a la derecha (iframe).
 * Guarda en localStorage vía `saveInvoiceTemplate`.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Printer,
  Eye,
  EyeOff,
  Palette,
  Ruler,
  Type as TypeIcon,
  Image as ImageIcon,
  Layers,
} from "lucide-react";
import {
  DEFAULT_TEMPLATE,
  loadInvoiceTemplate,
  resetInvoiceTemplate,
  saveInvoiceTemplate,
} from "@/lib/invoiceTemplate";
import type { InvoiceTemplate } from "@/lib/invoiceTemplate";
import {
  generateInvoiceHTML,
  printInvoice,
} from "@/utils/invoiceGenerator";
import type { InvoiceData } from "@/utils/invoiceGenerator";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getIssuerAddress } from "@/lib/fiscalAddress";

// ── Dummy invoice for the preview ─────────────────────────────────────────────

function buildDummyInvoice(): InvoiceData {
  const issuer = getIssuerAddress();
  const street = issuer.street;
  const cityLine = issuer.cityLine;
  return {
    invoiceNumber: "FAC-2026-00123",
    orderId: "TCG-20260417-1234",
    date: new Date().toISOString(),
    operationDate: new Date().toISOString(),
    paymentMethod: "Tarjeta (Stripe)",
    paymentStatus: "paid",
    verifactuHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    verifactuQR: "",
    verifactuStatus: "Pendiente envío AEAT",
    issuerName: SITE_CONFIG.legalName,
    issuerCIF: SITE_CONFIG.cif,
    issuerAddress: street,
    issuerCity: cityLine,
    issuerCountry: SITE_CONFIG.country,
    issuerPhone: SITE_CONFIG.phone,
    issuerEmail: SITE_CONFIG.email,
    clientName: "Juan Pérez García",
    clientCIF: "12345678Z",
    clientAddress: "Calle Mayor 25, 3ºB",
    clientCity: "28013 Madrid",
    clientProvince: "Madrid",
    clientCountry: "España",
    intracomunitario: false,
    items: [
      {
        name: "Booster Box Pokémon 151 (ES)",
        quantity: 2,
        unitPriceWithVAT: 149.95,
        vatRate: 21,
      },
      {
        name: "Sleeves Ultra Pro Eclipse Black (100 uds.)",
        quantity: 3,
        unitPriceWithVAT: 9.9,
        vatRate: 21,
      },
      {
        name: "Playmat TCG Academy — edición limitada",
        quantity: 1,
        unitPriceWithVAT: 24.95,
        vatRate: 21,
      },
    ],
    shipping: 0,
    couponCode: "BIENVENIDA10",
    couponDiscount: 10,
    pointsDiscount: 2.5,
  };
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <Icon size={18} color="#2563eb" />
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "#0f172a",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#334155",
          }}
        >
          {label}
        </label>
        {hint ? (
          <span style={{ fontSize: 11, color: "#64748b" }}>{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span
        style={{
          minWidth: 52,
          textAlign: "right",
          fontSize: 12,
          fontFamily: "monospace",
          color: "#0f172a",
          fontWeight: 600,
        }}
      >
        {value}
        {suffix}
      </span>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 40,
          height: 32,
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: 2,
          background: "#fff",
          cursor: "pointer",
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          padding: "6px 10px",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          fontFamily: "monospace",
          fontSize: 12,
          color: "#0f172a",
        }}
      />
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        padding: "8px 10px",
        background: value ? "#eff6ff" : "#f8fafc",
        border: `1px solid ${value ? "#93c5fd" : "#e2e8f0"}`,
        borderRadius: 8,
        fontSize: 13,
        color: "#0f172a",
        fontWeight: 500,
      }}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: "pointer" }}
      />
      {value ? <Eye size={14} color="#2563eb" /> : <EyeOff size={14} color="#94a3b8" />}
      {label}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "8px 10px",
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        fontSize: 13,
        color: "#0f172a",
      }}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      style={{
        width: "100%",
        padding: "8px 10px",
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        fontSize: 13,
        color: "#0f172a",
        fontFamily: "inherit",
        resize: "vertical",
      }}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditorFacturaPage() {
  const [tpl, setTpl] = useState<InvoiceTemplate>(DEFAULT_TEMPLATE);
  const [dirty, setDirty] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Load stored template on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de plantilla persistida
    setTpl(loadInvoiceTemplate());
  }, []);

  const dummy = useMemo(() => buildDummyInvoice(), []);
  const html = useMemo(() => generateInvoiceHTML(dummy, tpl), [dummy, tpl]);

  // Re-render iframe whenever html changes
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument ?? frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  function update<K extends keyof InvoiceTemplate>(
    key: K,
    value: InvoiceTemplate[K],
  ) {
    setTpl((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSavedMsg(null);
  }

  function handleSave() {
    saveInvoiceTemplate(tpl);
    setDirty(false);
    setSavedMsg("Plantilla guardada — se usará en todas las facturas");
    setTimeout(() => setSavedMsg(null), 3500);
  }

  function handleReset() {
    if (!confirm("¿Restablecer la plantilla a los valores por defecto?")) return;
    resetInvoiceTemplate();
    setTpl(DEFAULT_TEMPLATE);
    setDirty(false);
    setSavedMsg("Plantilla restablecida");
    setTimeout(() => setSavedMsg(null), 3500);
  }

  function handlePrintTest() {
    void printInvoice(dummy);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          href="/admin/fiscal"
          aria-label="Volver al panel fiscal"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#475569",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Panel fiscal
        </Link>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Editor visual de factura
          </h1>
          {dirty ? (
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                background: "#fef3c7",
                color: "#92400e",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              Cambios sin guardar
            </span>
          ) : null}
          {savedMsg ? (
            <span
              style={{
                fontSize: 12,
                padding: "3px 10px",
                background: "#dcfce7",
                color: "#166534",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              {savedMsg}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handlePrintTest}
          aria-label="Imprimir factura de prueba"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            color: "#334155",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Printer size={15} />
          Imprimir prueba
        </button>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Restablecer plantilla"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "#fff",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            color: "#b91c1c",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RotateCcw size={15} />
          Restablecer
        </button>
        <button
          type="button"
          onClick={handleSave}
          aria-label="Guardar plantilla"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            background: dirty ? "#16a34a" : "#94a3b8",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: dirty ? "0 2px 4px rgba(22,163,74,0.25)" : "none",
          }}
        >
          <Save size={15} />
          Guardar
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 20,
          padding: 20,
          maxWidth: 1600,
          margin: "0 auto",
        }}
      >
        {/* Left: controls */}
        <div
          style={{
            maxHeight: "calc(100vh - 110px)",
            overflowY: "auto",
            paddingRight: 6,
          }}
        >
          <Section title="Marca" icon={ImageIcon}>
            <Row label="Nombre de la marca">
              <TextInput
                value={tpl.brandName}
                onChange={(v) => update("brandName", v)}
                placeholder="TCG Academy"
              />
            </Row>
            <Row label="Subtítulo de la marca">
              <TextInput
                value={tpl.brandSub}
                onChange={(v) => update("brandSub", v)}
                placeholder="Tienda especialista en TCG"
              />
            </Row>
            <Toggle
              value={tpl.showBrandSub}
              onChange={(v) => update("showBrandSub", v)}
              label="Mostrar subtítulo"
            />
            <Row label="Tamaño del logo" hint={`${tpl.logoSize}px`}>
              <Slider
                value={tpl.logoSize}
                onChange={(v) => update("logoSize", v)}
                min={80}
                max={300}
                suffix="px"
              />
            </Row>
          </Section>

          <Section title="Márgenes" icon={Ruler}>
            <Row label="Superior" hint="desde el borde">
              <Slider
                value={tpl.paddingTop}
                onChange={(v) => update("paddingTop", v)}
                min={0}
                max={30}
                suffix="mm"
              />
            </Row>
            <Row label="Laterales">
              <Slider
                value={tpl.paddingX}
                onChange={(v) => update("paddingX", v)}
                min={6}
                max={30}
                suffix="mm"
              />
            </Row>
            <Row label="Inferior">
              <Slider
                value={tpl.paddingBottom}
                onChange={(v) => update("paddingBottom", v)}
                min={10}
                max={40}
                suffix="mm"
              />
            </Row>
          </Section>

          <Section title="Espaciados" icon={Ruler}>
            <Row label="Tras cabecera">
              <Slider
                value={tpl.gapAfterHeader}
                onChange={(v) => update("gapAfterHeader", v)}
                min={0}
                max={40}
                suffix="px"
              />
            </Row>
            <Row label="Tras bloque emisor/cliente">
              <Slider
                value={tpl.gapAfterParties}
                onChange={(v) => update("gapAfterParties", v)}
                min={0}
                max={40}
                suffix="px"
              />
            </Row>
            <Row label="Tras barra de pedido">
              <Slider
                value={tpl.gapAfterOrderBar}
                onChange={(v) => update("gapAfterOrderBar", v)}
                min={0}
                max={40}
                suffix="px"
              />
            </Row>
            <Row label="Tras tabla de productos">
              <Slider
                value={tpl.gapAfterTable}
                onChange={(v) => update("gapAfterTable", v)}
                min={0}
                max={40}
                suffix="px"
              />
            </Row>
          </Section>

          <Section title="Colores" icon={Palette}>
            <Row label="Color primario" hint="cabecera / tabla">
              <ColorPicker
                value={tpl.primaryColor}
                onChange={(v) => update("primaryColor", v)}
              />
            </Row>
            <Row label="Color de acento" hint='"Academy"'>
              <ColorPicker
                value={tpl.accentColor}
                onChange={(v) => update("accentColor", v)}
              />
            </Row>
            <Row label="TOTAL — borde">
              <ColorPicker
                value={tpl.totalBorderColor}
                onChange={(v) => update("totalBorderColor", v)}
              />
            </Row>
            <Row label="TOTAL — fondo">
              <ColorPicker
                value={tpl.totalBgColor}
                onChange={(v) => update("totalBgColor", v)}
              />
            </Row>
            <Row label="TOTAL — texto">
              <ColorPicker
                value={tpl.totalTextColor}
                onChange={(v) => update("totalTextColor", v)}
              />
            </Row>
          </Section>

          <Section title="Bloques visibles" icon={Layers}>
            <Toggle
              value={tpl.showOrderBar}
              onChange={(v) => update("showOrderBar", v)}
              label="Barra Nº pedido / fecha / pago"
            />
            <Toggle
              value={tpl.showDiscountsCard}
              onChange={(v) => update("showDiscountsCard", v)}
              label="Tarjeta de descuentos aplicados"
            />
            <Toggle
              value={tpl.showVatBreakdown}
              onChange={(v) => update("showVatBreakdown", v)}
              label="Desglose IVA por tipo"
            />
            <Toggle
              value={tpl.showLegal}
              onChange={(v) => update("showLegal", v)}
              label="Nota legal al pie"
            />
            <Toggle
              value={tpl.showVerifactu}
              onChange={(v) => update("showVerifactu", v)}
              label="Bloque VeriFactu (CSV + QR)"
            />
          </Section>

          <Section title="Etiquetas" icon={TypeIcon}>
            <Row label="Título">
              <TextInput
                value={tpl.labelTitle}
                onChange={(v) => update("labelTitle", v)}
              />
            </Row>
            <Row label="Datos del cliente">
              <TextInput
                value={tpl.labelClient}
                onChange={(v) => update("labelClient", v)}
              />
            </Row>
            <Row label="Datos del negocio">
              <TextInput
                value={tpl.labelIssuer}
                onChange={(v) => update("labelIssuer", v)}
              />
            </Row>
            <Row label="Nº pedido">
              <TextInput
                value={tpl.labelOrderNum}
                onChange={(v) => update("labelOrderNum", v)}
              />
            </Row>
            <Row label="Fecha emisión">
              <TextInput
                value={tpl.labelEmissionDate}
                onChange={(v) => update("labelEmissionDate", v)}
              />
            </Row>
            <Row label="Fecha operación">
              <TextInput
                value={tpl.labelOperationDate}
                onChange={(v) => update("labelOperationDate", v)}
              />
            </Row>
            <Row label="Forma de pago">
              <TextInput
                value={tpl.labelPaymentMethod}
                onChange={(v) => update("labelPaymentMethod", v)}
              />
            </Row>
            <Row label="Texto legal (pie)">
              <TextArea
                value={tpl.legalText}
                onChange={(v) => update("legalText", v)}
                rows={3}
              />
            </Row>
          </Section>

          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              padding: 12,
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: 8,
              lineHeight: 1.5,
            }}
          >
            Los datos de <strong>emisor</strong> (razón social, CIF, dirección,
            email, teléfono) se leen siempre de <code>SITE_CONFIG</code> y no se
            pueden editar aquí. Para cambiarlos, modifica{" "}
            <code>src/config/siteConfig.ts</code>.
          </div>
        </div>

        {/* Right: preview */}
        <div
          style={{
            background: "#e2e8f0",
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            overflow: "hidden",
            minHeight: "calc(100vh - 140px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: "#475569",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Vista previa en vivo · factura de ejemplo</span>
            <span style={{ fontSize: 10, opacity: 0.8 }}>
              los datos de ejemplo son ficticios
            </span>
          </div>
          <iframe
            ref={iframeRef}
            title="Vista previa de la factura"
            style={{
              flex: 1,
              border: "none",
              background: "#fff",
              width: "100%",
              minHeight: 800,
            }}
          />
        </div>
      </div>
    </div>
  );
}
