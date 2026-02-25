import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)

    // Hilt Requirements
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

val localProperties = Properties().apply {
    val localPropertiesFile = rootProject.file("local.properties")
    if (localPropertiesFile.exists()) {
        load(localPropertiesFile.inputStream())
    }
}

android {
    namespace = "com.example.awscognito"
    compileSdk {
        version = release(36)
    }

    defaultConfig {
        applicationId = "com.example.awscognito"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // Build variants for different environments
    buildTypes {
        debug {
            // Use local.properties override if available, otherwise use ngrok dev tunnel
            val debugServerUrl = localProperties.getProperty("SERVER_URL")
                ?: "https://xp-server.ngrok.dev"
            buildConfigField("String", "SERVER_URL", "\"$debugServerUrl\"")

            // Enable detailed logging in debug
            buildConfigField("Boolean", "ENABLE_LOGGING", "true")
        }

        create("staging") {
            initWith(getByName("debug"))

            // Staging server URL - configure for your staging environment
            val stagingServerUrl = localProperties.getProperty("STAGING_SERVER_URL")
                ?: "https://staging-api.example.com"
            buildConfigField("String", "SERVER_URL", "\"$stagingServerUrl\"")
            buildConfigField("Boolean", "ENABLE_LOGGING", "true")

            // Use debug signing for staging
            signingConfig = signingConfigs.getByName("debug")
        }

        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )

            // Production server URL - must be configured
            val releaseServerUrl = localProperties.getProperty("RELEASE_SERVER_URL")
                ?: "https://api.example.com"
            buildConfigField("String", "SERVER_URL", "\"$releaseServerUrl\"")
            buildConfigField("Boolean", "ENABLE_LOGGING", "false")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    // Hilt Requirement
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        buildConfig = true
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    // Standard: Navigation
    implementation(libs.androidx.navigation.compose)
    // Standard: ViewModel
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    // Standard: Coroutines
    implementation(libs.kotlinx.coroutines.android)

    // AWS Amplify
    implementation(libs.amplify.core)
    implementation(libs.amplify.auth.cognito)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.moshi)
    implementation(libs.moshi)
    implementation(libs.moshi.kotlin)
    ksp(libs.moshi.kotlin.codegen)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)

    // Google Sign-In
    implementation(libs.google.signin)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services)
    implementation(libs.google.id)

    // Browser (Custom Tabs for Apple Sign-In)
    implementation(libs.androidx.browser)
}