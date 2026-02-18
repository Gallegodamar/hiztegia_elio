import { Component, ReactNode } from 'react';

type ErrorBoundaryState = { hasError: boolean; message: string };
type ErrorBoundaryProps = { children: ReactNode };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // explicit declarations needed when useDefineForClassFields is false
  declare state: ErrorBoundaryState;
  declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'Errore ezezaguna';
    return { hasError: true, message };
  }

  render(): ReactNode {
    const { hasError, message } = this.state;
    if (hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-md text-center space-y-4">
            <h1 className="text-xl font-bold text-red-600">Zerbait txarto joan da</h1>
            <p className="text-sm text-gray-600">{message}</p>
            <button
              type="button"
              className="btn-primary px-6 py-2 text-sm"
              onClick={() => window.location.reload()}
            >
              Aplikazioa berrabiarazi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
