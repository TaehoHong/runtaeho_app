import React from 'react';
import { render } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { reportError } from '~/config/sentry';

jest.mock('~/config/sentry', () => ({ reportError: jest.fn() }));

it('reports a handled render failure once while showing the existing recovery popup', () => {
  const error = new Error('Synthetic rendering failure');
  const Broken = (): React.ReactElement => { throw error; };
  const logs = [jest.spyOn(console, 'error'), jest.spyOn(console, 'group'), jest.spyOn(console, 'groupEnd')];
  logs.forEach(log => log.mockImplementation(() => {}));
  try {
    const screen = render(<ErrorBoundary><Broken /></ErrorBoundary>);
    expect(screen.getByText('앱에 문제가 발생했어요')).toBeTruthy();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(jest.mocked(reportError).mock.calls[0]?.[0]).toBe(error);
  } finally {
    logs.forEach(log => log.mockRestore());
  }
});
