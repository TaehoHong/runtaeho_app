/**
 * Statistics Error Boundary
 * 통계 기능 전용 에러 바운더리
 */

import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GREY, PRIMARY } from '~/shared/styles';

interface StatisticsErrorFallbackProps {
  error: Error | undefined;
  onRetry?: () => void;
}

export const StatisticsErrorFallback: React.FC<StatisticsErrorFallbackProps> = ({
  error,
  onRetry
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>통계를 불러올 수 없습니다</Text>
    <Text style={styles.message}>{error?.message || '잠시 후 다시 시도해주세요'}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
    )}
  </View>
);

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class StatisticsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[StatisticsErrorBoundary] Error caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <StatisticsErrorFallback
          error={this.state.error || undefined}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: GREY[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: PRIMARY[500],
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY.WHITE,
  },
});
