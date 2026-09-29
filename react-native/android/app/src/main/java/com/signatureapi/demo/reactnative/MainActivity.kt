package com.signatureapi.demo.reactnative

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.signatureapi.demo.reactnative.config.LaunchArguments

class MainActivity : ReactActivity() {

  /** The component registered in index.js. */
  override fun getMainComponentName(): String = "SignatureAPIDemo"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // Before React Native starts, so JavaScript can read them on first render.
    LaunchArguments.capture(intent)
    super.onCreate(savedInstanceState)
  }
}
