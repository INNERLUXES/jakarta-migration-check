package com.larkspur.books.model;

import javax.persistence.*;

/**
 * A book of the shop. Mapped with javax.persistence.Table in the old schema.
 */
@Entity
@Table(name = "books")
public class Book {
    @Id
    @GeneratedValue
    private Long id;

    @javax.validation.constraints.NotNull
    private String title;

    static final String LOCK_TIMEOUT = "javax.persistence.lock.timeout";
}
