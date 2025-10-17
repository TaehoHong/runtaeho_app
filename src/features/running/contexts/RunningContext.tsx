import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useRunningViewModel } from '../viewmodels/RunningViewModel';
import { RunningState } from '../models/running-types';
import type { Location } from '../models/Location';
import type { RunningRecord } from '../models/RunningRecord';

/**
 * RunningViewModel의 반환 타입
 * useRunningViewModel의 실제 반환 타입 사용
 */
export type RunningViewModelType = ReturnType<typeof useRunningViewModel>;

/**
 * RunningContext
 * ViewModel 상태를 전역으로 공유
 */
const RunningContext = createContext<RunningViewModelType | undefined>(undefined);

interface RunningProviderProps {
  children: ReactNode;
}

/**
 * RunningProvider
 * RunningViewModel을 한 번만 생성하여 하위 컴포넌트들과 공유
 */
export const RunningProvider: React.FC<RunningProviderProps> = ({ children }) => {
  const viewModel = useRunningViewModel();

  return (
    <RunningContext.Provider value={viewModel}>
      {children}
    </RunningContext.Provider>
  );
};

/**
 * useRunning Hook
 * RunningContext를 사용하는 편리한 Hook
 */
export const useRunning = (): RunningViewModelType => {
  const context = useContext(RunningContext);
  if (!context) {
    throw new Error('useRunning must be used within a RunningProvider');
  }
  return context;
};
