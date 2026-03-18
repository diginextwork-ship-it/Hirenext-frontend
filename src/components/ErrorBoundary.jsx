import { Component } from "react";
import ErrorPage from "../pages/ErrorPage";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleWindowError = this.handleWindowError.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled UI error:", error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleWindowError(event) {
    this.setState({ hasError: true, error: event.error || event.message });
  }

  handleUnhandledRejection(event) {
    this.setState({ hasError: true, error: event.reason || "Unhandled promise rejection." });
  }

  handleRetry() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const code = Number(error?.status || error?.statusCode) || 500;
      const message =
        typeof error?.message === "string" && error.message.trim()
          ? error.message
          : "An unexpected error occurred. Please refresh and try again.";

      return (
        <ErrorPage
          code={code}
          title="Unexpected application error"
          message={message}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
