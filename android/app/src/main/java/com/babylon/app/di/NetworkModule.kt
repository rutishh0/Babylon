package com.babylon.app.di

import com.babylon.app.BuildConfig
import com.babylon.app.data.api.BabylonApiService
import com.babylon.app.data.api.PinInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * The PIN is read from BuildConfig (injected from GitHub Actions secret or local.properties).
     * Default is empty string = no PIN.
     */
    @Provides
    @Named("babylonPin")
    fun providePin(): String = try {
        BuildConfig::class.java.getField("BABYLON_PIN").get(null) as? String ?: ""
    } catch (_: Exception) { "" }

    @Provides
    @Singleton
    fun provideOkHttpClient(pinInterceptor: PinInterceptor): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(pinInterceptor)
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = if (BuildConfig.DEBUG)
                        HttpLoggingInterceptor.Level.BASIC
                    else
                        HttpLoggingInterceptor.Level.NONE
                }
            )
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            // Stream requests need longer timeout for large video responses
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): BabylonApiService =
        retrofit.create(BabylonApiService::class.java)
}
