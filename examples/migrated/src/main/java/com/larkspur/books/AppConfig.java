package com.larkspur.books;

import static jakarta.persistence.LockModeType.PESSIMISTIC_WRITE;

import jakarta.annotation.Resource;
import jakarta.transaction.Transactional;
import javax.annotation.Nonnull;
import javax.transaction.xa.XAResource;

public class AppConfig {
    @Resource(name = "jdbc/orders")
    private Object orders;

    @Transactional
    public Object lock() {
        return PESSIMISTIC_WRITE;
    }

    @Nonnull
    public Class<?> restApplication() throws ClassNotFoundException {
        return Class.forName("jakarta.ws.rs.core.Application");
    }

    public int flags(XAResource resource) {
        return XAResource.TMNOFLAGS;
    }
}
