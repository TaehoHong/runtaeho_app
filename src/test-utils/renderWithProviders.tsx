import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createTestQueryClient } from './queryClient';

type ExtendedRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient;
};

interface WrapperProps {
  children: ReactNode;
  client: QueryClient;
}

const TestProviders = ({ children, client }: WrapperProps) => {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
};

export const renderWithProviders = (
  ui: ReactElement,
  { queryClient, ...options }: ExtendedRenderOptions = {}
) => {
  const client = queryClient ?? createTestQueryClient();

  return {
    ...render(ui, {
      wrapper: ({ children }) => <TestProviders client={client}>{children}</TestProviders>,
      ...options,
    }),
    queryClient: client,
  };
};
