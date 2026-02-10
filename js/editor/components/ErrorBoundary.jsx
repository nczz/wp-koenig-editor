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
                <div style={{
                    padding: '40px',
                    maxWidth: '600px',
                    margin: '80px auto',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    textAlign: 'center',
                }}>
                    <h2 style={{ marginBottom: '16px', color: '#d63638' }}>
                        Editor Error
                    </h2>
                    <p style={{ color: '#555', marginBottom: '24px', lineHeight: '1.6' }}>
                        The Koenig editor encountered an error. Your last saved content is safe.
                    </p>
                    <pre style={{
                        background: '#f6f7f7',
                        padding: '12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: '#8b0000',
                        textAlign: 'left',
                        overflow: 'auto',
                        marginBottom: '24px',
                    }}>
                        {this.state.error?.message || 'Unknown error'}
                    </pre>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '8px 20px',
                                background: '#2271b1',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Reload Page
                        </button>
                        <a
                            href={config.editPostListUrl}
                            style={{
                                padding: '8px 20px',
                                background: '#f0f0f0',
                                color: '#333',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                fontSize: '14px',
                                display: 'inline-flex',
                                alignItems: 'center',
                            }}
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
