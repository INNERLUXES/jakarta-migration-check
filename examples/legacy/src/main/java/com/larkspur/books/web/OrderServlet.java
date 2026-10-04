package com.larkspur.books.web;

import java.io.IOException;
import javax.annotation.PostConstruct;
import javax.crypto.Mac;
import javax.naming.InitialContext;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;

@WebServlet("/orders")
public class OrderServlet extends HttpServlet {
    private DataSource orders;

    @PostConstruct
    void lookUp() throws Exception {
        orders = (DataSource) new InitialContext().lookup("java:comp/env/jdbc/orders");
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        // A signed receipt; javax.crypto stays in the JDK.
        Mac mac = Mac.getInstance("HmacSHA256");
        response.setContentType("text/plain");
        response.getWriter().println(mac.getAlgorithm());
    }
}
