package com.signatureapi.demo.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.signatureapi.demo.mobile.ceremony.CeremonyEventDelivery
import com.signatureapi.demo.mobile.ui.DemoApp

class MainActivity : ComponentActivity() {
    private val viewModel: SigningViewModel by viewModels { SigningViewModel.factory(BuildConfig.DEMO_SERVER_URL) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { DemoApp(viewModel, eventDelivery()) }
    }

    /**
     * The `eventDelivery` Gradle property, unless the launch intent overrides it.
     *
     * The override is an intent extra, not an instrumentation argument, so each
     * instrumented test picks its mode when it launches the activity and one run
     * covers both modes, with no test code in the app. Debug builds only: other
     * apps can launch this activity with any extras.
     */
    private fun eventDelivery(): CeremonyEventDelivery {
        val override = intent.getStringExtra(EXTRA_EVENT_DELIVERY).takeIf { BuildConfig.DEBUG }
        return CeremonyEventDelivery.from(override ?: BuildConfig.EVENT_DELIVERY)
    }

    companion object {
        /** `redirect` or `message`. */
        const val EXTRA_EVENT_DELIVERY = "com.signatureapi.demo.mobile.EVENT_DELIVERY"
    }
}
