import React from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden text-center border border-gray-100">
            <div className="bg-red-50 p-6 flex justify-center border-b border-red-100">
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center shadow-inner">
                <AlertOctagon className="w-10 h-10" />
              </div>
            </div>
            
            <div className="p-8">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Oops! Something went wrong</h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                We're sorry, but the application encountered an unexpected error. Please try reloading the page.
              </p>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 border border-transparent text-sm font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <RefreshCcw className="w-5 h-5" />
                Reload Application
              </button>

              {process.env.NODE_ENV !== 'production' && (
                <div className="mt-6 text-left">
                  <details className="cursor-pointer group">
                    <summary className="text-xs font-bold text-gray-400 uppercase tracking-widest outline-none group-hover:text-gray-600 transition-colors">
                      Developer Details
                    </summary>
                    <div className="mt-4 p-4 bg-gray-900 rounded-xl overflow-x-auto">
                      <p className="text-red-400 text-xs font-mono mb-2">{this.state.error?.toString()}</p>
                      <pre className="text-gray-300 text-[10px] font-mono whitespace-pre-wrap">
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
