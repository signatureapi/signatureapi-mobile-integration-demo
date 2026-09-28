package com.signatureapi.demo.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.signatureapi.demo.mobile.ui.DemoApp

class MainActivity : ComponentActivity() {
    private val viewModel: SigningViewModel by viewModels { SigningViewModel.factory(BuildConfig.DEMO_SERVER_URL) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { DemoApp(viewModel) }
    }
}
