package com.hongtaeho.app.typography

import android.content.res.Configuration
import android.text.InputType
import android.text.TextUtils
import android.view.ViewGroup
import com.facebook.react.ReactPackage
import com.facebook.react.ViewManagerOnDemandReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.views.text.TextAttributes
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.textinput.ReactTextInputManager

/** Keep RN's input implementation, refreshing its stored SP attributes on font changes. */
class FontScaleTextInputPackage : ReactPackage, ViewManagerOnDemandReactPackage {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
      listOf(FontScaleTextInputManager())

  override fun getViewManagerNames(reactContext: ReactApplicationContext): Collection<String> =
      listOf(ReactTextInputManager.REACT_CLASS)

  override fun createViewManager(
      reactContext: ReactApplicationContext,
      viewManagerName: String,
  ): ViewManager<*, *>? =
      if (viewManagerName == ReactTextInputManager.REACT_CLASS) FontScaleTextInputManager() else null
}

private class FontScaleTextInputManager : ReactTextInputManager() {
  override fun updateProperties(viewToUpdate: ReactEditText, props: ReactStylesDiffMap) {
    (viewToUpdate as FontScaleEditText).captureLineHeightAttributes(props)
    super.updateProperties(viewToUpdate, props)
  }

  override fun onAfterUpdateTransaction(view: ReactEditText) {
    super.onAfterUpdateTransaction(view)
    if ((view.inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE) == 0) {
      view.setHorizontallyScrolling(true)
      if (view.maxLines != 1) view.maxLines = 1
      if (view.ellipsize != TextUtils.TruncateAt.END) view.ellipsize = TextUtils.TruncateAt.END
    } else if (view.ellipsize == TextUtils.TruncateAt.END) {
      view.ellipsize = null
    }
  }

  override fun createViewInstance(context: ThemedReactContext): ReactEditText =
      FontScaleEditText(context).apply {
        // Match ReactTextInputManager.createViewInstance in the pinned RN 0.81 implementation.
        inputType = inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE.inv()
        returnKeyType = "done"
        layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
      }
}

private class FontScaleEditText(context: ThemedReactContext) : ReactEditText(context) {
  private var lastFontScale = context.resources.configuration.fontScale
  private val lineHeightAttributes = TextAttributes()
  private var appliedLineHeight = Float.NaN

  fun captureLineHeightAttributes(props: ReactStylesDiffMap) {
    // Keep RN's raw line-height inputs; its public TextAttributes owns native SP conversion.
    if (!props.hasKey("lineHeight") && !props.hasKey("allowFontScaling") &&
        !props.hasKey("maxFontSizeMultiplier")) return
    if (props.hasKey("lineHeight")) {
      lineHeightAttributes.lineHeight = props.getFloat("lineHeight", 0f).toInt().toFloat()
    }
    if (props.hasKey("allowFontScaling")) {
      lineHeightAttributes.allowFontScaling = props.getBoolean("allowFontScaling", true)
    }
    if (props.hasKey("maxFontSizeMultiplier")) {
      lineHeightAttributes.maxFontSizeMultiplier = props.getFloat("maxFontSizeMultiplier", Float.NaN)
    }
    appliedLineHeight = lineHeightAttributes.effectiveLineHeight
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    val fontScaleChanged = lastFontScale != newConfig.fontScale
    lastFontScale = newConfig.fontScale
    super.onConfigurationChanged(newConfig)
    if (fontScaleChanged) {
      applyTextAttributes()
      val newLineHeight = lineHeightAttributes.effectiveLineHeight
      FontScaleLineHeightSpan.refresh(this, appliedLineHeight, newLineHeight)
      appliedLineHeight = newLineHeight
    }
  }
}
