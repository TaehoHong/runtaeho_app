package com.hongtaeho.app.runninglive

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class RunningLiveStatusReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    val command = RunningLiveStatusModule.storePendingCommand(context, action)
    val emitted = RunningLiveStatusModule.emitCommandIfPossible(command)

    if (!emitted) {
      RunningLiveStatusModule.openApp(context)
    }
  }
}
