import { t, useAppLanguage } from '~/i18n';
import { ComingSoonView } from '~/features/common';

/**
 * 공지사항 화면 라우트
 */
export default function NoticeScreen() {
  useAppLanguage();
  return <ComingSoonView title={t("공지사항")} />;
}
