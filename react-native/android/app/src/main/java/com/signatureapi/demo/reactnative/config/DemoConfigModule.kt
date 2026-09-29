package com.signatureapi.demo.reactnative.config

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import com.facebook.react.bridge.ReactApplicationContext

/**
 * The app's configuration for JavaScript (src/config/specs/NativeDemoConfig.ts):
 * manifest `<meta-data>` set from Gradle properties, and launch arguments from a
 * test runner.
 */
class DemoConfigModule(context: ReactApplicationContext) : NativeDemoConfigSpec(context) {

    /** A manifest `<meta-data>` value, such as DemoServerURL from the demoServerUrl Gradle property. */
    override fun buildSetting(name: String): String? {
        val info = reactApplicationContext.packageManager.getApplicationInfo(
            reactApplicationContext.packageName,
            PackageManager.GET_META_DATA,
        )
        return info.metaData?.getString(name)
    }

    override fun launchArgument(name: String): String? = LaunchArguments.get(name)

    companion object {
        const val NAME = NativeDemoConfigSpec.NAME
    }
}

/**
 * Intent extras of the launch, captured by MainActivity before React Native
 * starts, so they are there however early JavaScript asks. Maestro and
 * `adb shell am start -e name value` pass launch arguments this way.
 */
object LaunchArguments {
    @Volatile
    private var extras: Bundle? = null

    fun capture(intent: Intent?) {
        extras = intent?.extras?.let(::Bundle)
    }

    @Suppress("DEPRECATION") // Extras arrive typed (String, Boolean, Int…); any of them will do as text.
    fun get(name: String): String? = extras?.get(name)?.toString()
}
