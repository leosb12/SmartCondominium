plugins {
    id("com.android.application")
    // START: FlutterFire Configuration
    id("com.google.gms.google-services")
    // END: FlutterFire Configuration
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.si2.mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        // Habilita desugaring (requerido por flutter_local_notifications)
        isCoreLibraryDesugaringEnabled = true

        // Mantén Java 11 (si luego te pide 17, te dejo abajo cómo cambiar)
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        applicationId = "com.si2.mobile"

        // Asegúrate de minSdk >= 21 (si tu flutter.minSdkVersion es <21, fuerza 21)
        // minSdk = 21
        minSdk = flutter.minSdkVersion

        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Firma de debug para poder ejecutar --release sin claves
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    // Desugaring: ¡subido a 2.1.4 como pide el error!
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
