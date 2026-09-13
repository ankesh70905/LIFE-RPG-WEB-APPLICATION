import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Life RPG UI error", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="page-content error-boundary" role="alert">
        <section className="panel empty-state">
          <span className="feature-hero-icon" aria-hidden="true">🛡️</span>
          <h1>That quest hit a snag</h1>
          <p>We could not render this page. Your progress is safe.</p>
          <button className="button button-primary" type="button" onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </section>
      </main>
    );
  }
}
