import React from 'react';
import { render } from '@testing-library/react-native';
import { UnityPlaceholder, type UnityPlaceholderVariant } from '../UnityPlaceholder';

describe('UnityPlaceholder loading feedback', () => {
  it.each<UnityPlaceholderVariant>(['running', 'avatar', 'league'])(
    'announces the busy character state for %s without exposing decorative elements',
    variant => {
      const { getByRole, queryAllByRole } = render(<UnityPlaceholder variant={variant} />);

      expect(getByRole('progressbar', { name: '캐릭터 로딩 중' })).toHaveAccessibilityState({ busy: true });
      expect(queryAllByRole('image')).toHaveLength(0);
    }
  );
});
