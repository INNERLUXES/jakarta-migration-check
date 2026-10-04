package com.larkspur.books.web;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import javax.crypto.Mac;
import javax.naming.InitialContext;
import javax.sql.DataSource;

// Moved from javax.servlet.http.HttpServlet; a name in a comment is never reported.
@WebServlet("/orders")
public class OrderServlet extends HttpServlet {
    private DataSource orders;

    @PostConstruct
    void lookUp() throws Exception {
        orders = (DataSource) new InitialContext().lookup("java:comp/env/jdbc/orders");
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        Mac mac = Mac.getInstance("HmacSHA256");
        response.setContentType("text/plain");
        response.getWriter().println(mac.getAlgorithm());
    }
}
