package com.example.awscognito.core.networking

import android.content.Context
import com.example.awscognito.BuildConfig
import com.example.awscognito.data.repositories.auth.AuthEndpoints
import com.example.awscognito.data.repositories.messages.MessagesEndpoints
import com.example.awscognito.data.repositories.users.UsersEndpoints
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Cache
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.File
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val CACHE_SIZE = 10L * 1024 * 1024 // 10 MB

    @Provides
    @Singleton
    fun provideMoshi(): Moshi {
        return Moshi.Builder()
            .addLast(KotlinJsonAdapterFactory())
            .build()
    }

    @Provides
    @Singleton
    fun provideCache(@ApplicationContext context: Context): Cache {
        return Cache(File(context.cacheDir, "http_cache"), CACHE_SIZE)
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        cache: Cache,
        authInterceptor: AuthInterceptor
    ): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.ENABLE_LOGGING) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
        return OkHttpClient.Builder()
            .cache(cache)
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, moshi: Moshi): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.SERVER_URL + "/")
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }

    @Provides
    @Singleton
    fun provideMessagesEndpoints(retrofit: Retrofit): MessagesEndpoints {
        return retrofit.create(MessagesEndpoints::class.java)
    }

    @Provides
    @Singleton
    fun provideUsersEndpoints(retrofit: Retrofit): UsersEndpoints {
        return retrofit.create(UsersEndpoints::class.java)
    }

    @Provides
    @Singleton
    fun provideAuthEndpoints(retrofit: Retrofit): AuthEndpoints {
        return retrofit.create(AuthEndpoints::class.java)
    }
}