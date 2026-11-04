package com.hongtaeho.app.typography;

import android.text.Editable;
import android.widget.EditText;
import com.facebook.react.views.text.internal.span.CustomLineHeightSpan;

/** RN 0.81 adapter: update the uniform base line-height span without replacing input text. */
final class FontScaleLineHeightSpan {
  static void refresh(EditText view, float previous, float current) {
    if (Float.isNaN(previous) || Float.isNaN(current) || current <= 0 || previous == current) return;
    Editable text = view.getText();
    if (text == null) return;
    for (CustomLineHeightSpan span : text.getSpans(0, text.length(), CustomLineHeightSpan.class)) {
      if (span.getLineHeight() != (int) Math.ceil(previous)) continue;
      int start = text.getSpanStart(span);
      int end = text.getSpanEnd(span);
      int flags = text.getSpanFlags(span);
      text.removeSpan(span);
      text.setSpan(new CustomLineHeightSpan(current), start, end, flags);
    }
  }
}
