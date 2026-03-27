package com.babylon.app.data.api

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Named

/**
 * Adds the X-Babylon-Pin header to every request when a PIN is configured.
 * The PIN is optional — if empty, the header is omitted entirely.
 */
class PinInterceptor @Inject constructor(
    @Named("babylonPin") private val pin: String
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = if (pin.isNotBlank()) {
            chain.request().newBuilder()
                .addHeader("X-Babylon-Pin", pin)
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
