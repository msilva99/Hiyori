import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
   children: ReactNode;
}

interface State {
   hasError: boolean;
   error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
   constructor(props: Props) {
      super(props);
      this.state = { hasError: false, error: null };
   }

   static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error };
   }

   componentDidCatch(error: Error, info: ErrorInfo) {
      console.error("ErrorBoundary caught:", error, info.componentStack);
   }

   render() {
      if (this.state.hasError) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-page p-8">
               <div className="bg-surface rounded-3xl border border-border-hiyori shadow-sm max-w-md w-full p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                     <span className="text-3xl">⚠️</span>
                  </div>
                  <h1 className="text-2xl font-bold text-ink mb-2">Something went wrong</h1>
                  <p className="text-ink-muted mb-6">
                     {this.state.error?.message ?? "An unexpected error occurred."}
                  </p>
                  <button
                     onClick={() => window.location.reload()}
                     className="px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-colors cursor-pointer"
                  >
                     Reload App
                  </button>
               </div>
            </div>
         );
      }

      return this.props.children;
   }
}
