import React from 'react';

const config = window.wpKoenigConfig;

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="koenig-error">
                    <h2 className="koenig-error__title">
                        Editor Error
                    </h2>
                    <p className="koenig-error__message">
                        The Koenig editor encountered an error. Your last saved content is safe.
                    </p>
                    <pre className="koenig-error__stack">
                        {this.state.error?.message || 'Unknown error'}
                    </pre>
                    <div className="koenig-error__actions">
                        <button
                            type="button"
                            className="koenig-btn koenig-btn--primary"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </button>
                        <a
                            href={config.editPostListUrl}
                            className="koenig-btn koenig-btn--secondary"
                        >
                            Back to Posts
                        </a>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
