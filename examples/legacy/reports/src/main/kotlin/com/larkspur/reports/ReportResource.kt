package com.larkspur.reports

import javax.inject.Inject
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.core.MediaType as Media

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
