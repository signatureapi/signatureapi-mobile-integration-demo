plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.signatureapi.demo.mobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.signatureapi.demo.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        val demoServerUrl = providers.gradleProperty("demoServerUrl").get()
        buildConfigField("String", "DEMO_SERVER_URL", "\"$demoServerUrl\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

/**
 * Copies the shared brand fonts (../design/fonts) into generated Android
 * resources, renamed to valid resource names: Inter-SemiBold.ttf -> inter_semibold.ttf.
 */
abstract class CopyBrandFonts : DefaultTask() {
    @get:InputDirectory
    abstract val fontsDir: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun copy() {
        val fontDir = outputDir.get().dir("font").asFile.apply {
            deleteRecursively()
            mkdirs()
        }
        fontsDir.get().asFile.listFiles { file -> file.extension == "ttf" }.orEmpty().forEach { font ->
            val resourceName = font.nameWithoutExtension.lowercase().replace('-', '_')
            font.copyTo(File(fontDir, "$resourceName.ttf"), overwrite = true)
        }
    }
}

val copyBrandFonts = tasks.register<CopyBrandFonts>("copyBrandFonts") {
    fontsDir.set(rootProject.layout.projectDirectory.dir("../design/fonts"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.res?.addGeneratedSourceDirectory(copyBrandFonts, CopyBrandFonts::outputDir)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    debugImplementation(libs.androidx.compose.ui.tooling)

    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.espresso.web)
    androidTestImplementation(libs.androidx.uiautomator)
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
