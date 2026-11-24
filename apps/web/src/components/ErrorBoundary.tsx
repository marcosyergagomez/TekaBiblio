import { Component, type ReactNode } from 'react';
import { i18n } from '../i18n';

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="login-wrap">
          <div className="card login-card" role="alert">
            <h2>{i18n.t('common.unexpected')}</h2>
            <button type="button" onClick={this.reset}>
              {i18n.t('common.retry')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
