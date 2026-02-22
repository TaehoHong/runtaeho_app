import { RunningState, ViewState } from '~/stores/app/appStore';
import { isTabBarVisible } from '~/shared/utils/tabBarVisibility';

describe('tabBarVisibility', () => {
  it('returns true only when running is stopped and view is loaded', () => {
    expect(isTabBarVisible(RunningState.Stopped, ViewState.Loaded)).toBe(true);

    expect(isTabBarVisible(RunningState.Running, ViewState.Loaded)).toBe(false);
    expect(isTabBarVisible(RunningState.Paused, ViewState.Loaded)).toBe(false);
    expect(isTabBarVisible(RunningState.Finished, ViewState.Loaded)).toBe(false);
    expect(isTabBarVisible(RunningState.Stopped, ViewState.Loading)).toBe(false);
  });
});
