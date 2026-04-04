import { Component } from "react";
import ErrorPage from "../pages/ErrorPage";

const getErrorMessage = (error) => {
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  return "";
};

const isRecoverableAsyncError = (error) => {
  const code = Number(error?.status || error?.statusCode) || 0;
  const message = getErrorMessage(error).trim().toLowerCase();

  if (error?.name === "AbortError") return true;

  if (
    error instanceof TypeError &&
    (message.includes("fetch") ||
      message.includes("network") ||
      message.includes("load"))
  ) {
    return true;
  }

  if (code === 401 || code === 403 || code === 404 || code === 409 || code === 429) {
    return true;
  }

  return (
    message.includes("not found") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("session expired") ||
    message.includes("request failed")
  );
};

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
    const nextError = event.error || event.message;

    if (isRecoverableAsyncError(nextError)) {
      console.warn("Recoverable window error ignored by ErrorBoundary:", nextError);
      return;
    }

    this.setState({ hasError: true, error: nextError });
  }

  handleUnhandledRejection(event) {
    const nextError = event.reason || "Unhandled promise rejection.";

    if (isRecoverableAsyncError(nextError)) {
      console.warn(
        "Recoverable async error ignored by ErrorBoundary:",
        nextError,
      );
      event.preventDefault();
      return;
    }

    this.setState({ hasError: true, error: nextError });
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
