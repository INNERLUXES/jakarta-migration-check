package com.larkspur.books;

import static javax.persistence.LockModeType.PESSIMISTIC_WRITE;

import javax.annotation.*;
import javax.transaction.Transactional;
import javax.transaction.xa.XAResource;

public class AppConfig {
    @Resource(name = "jdbc/orders")
    private Object orders;

    @Transactional
    public Object lock() {
        return PESSIMISTIC_WRITE;
    }

    public Class<?> restApplication() throws ClassNotFoundException {
        return Class.forName("javax.ws.rs.core.Application");
    }

    public int flags(XAResource resource) {
        return XAResource.TMNOFLAGS;
    }
}
