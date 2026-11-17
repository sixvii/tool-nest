import { Component } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';
import Button from './ui/Button';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Something went wrong</h2>
            <p className="text-sm text-slate-400 mt-1">
              This page hit an unexpected error. Try reloading.
            </p>
          </div>
          <Button variant="primary" onClick={() => globalThis.location.reload()}>
            Reload page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};
