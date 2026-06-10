import React, { Component, type ReactNode } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { ErrorPopup } from '~/features/support/views/ErrorPopup';
import { ErrorService } from '../services/ErrorService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * React 컴포넌트 트리에서 발생하는 JavaScript 에러를 캐치하고 처리
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // ErrorService를 통해 에러 처리
    const errorService = ErrorService.getInstance();
    errorService.handleError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    }, false); // ErrorBoundary에서는 사용자에게 직접 표시하지 않음

    // 커스텀 에러 핸들러 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleClose = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleInquiry = () => {
    const errorCode = this.state.error?.name || 'UNKNOWN';
    this.handleClose();
    router.push(
      `/user/error-inquiry?errorCode=${encodeURIComponent(errorCode)}&screenName=ErrorBoundary` as Href
    );
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback UI가 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorPopup
          visible
          onClose={this.handleClose}
          onInquiry={this.handleInquiry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * HOC 형태로 ErrorBoundary 적용
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} {...(onError && { onError })}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
