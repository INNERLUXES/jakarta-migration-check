package com.larkspur.reports

import jakarta.inject.Inject
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.core.MediaType as Media

/* A report of the day. /* Nested comments are fine in Kotlin. */ javax.ws.rs.POST is not used. */
@Path("/reports")
class ReportResource @Inject constructor(private val store: ReportStore) {
    @GET
    fun daily(): String = """
        {"type": "${Media.APPLICATION_JSON}", "rows": ${store.count()}}
    """.trimIndent()
}

interface ReportStore {
    fun count(): Int
}
