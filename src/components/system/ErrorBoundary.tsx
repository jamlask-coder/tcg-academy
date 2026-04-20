"use client";
/**
 * ErrorBoundary — React error boundary que delega en errorReporter.
 *
 * Se ofrece como componente opcional: envuelve zonas concretas donde
 * prefieras un fallback controlado en lugar del error nativo de React.
 *
 * No está montado globalmente para no alterar la renderización del sitio.
 * Uso puntual:
 *   <ErrorBoundary fallback={<p>Algo falló aquí</p>}>
 *     <RiskySection />
 *   </ErrorBoundary>
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/errorReporter";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Nombre opcional que se adjunta al reporte para identificar la zona. */
  context?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      reportError(error, "boundary", this.props.context ?? info.componentStack?.slice(0, 200));
    } catch {
      /* never throw from boundary */
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Ha ocurrido un error al mostrar esta sección. Recarga la página.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
