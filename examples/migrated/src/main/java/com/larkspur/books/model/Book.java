package com.larkspur.books.model;

import jakarta.persistence.*;

/**
 * A book of the shop. Mapped with javax.persistence.Table before the move.
 */
@Entity
@Table(name = "books")
public class Book {
    @Id
    @GeneratedValue
    private Long id;

    @jakarta.validation.constraints.NotNull
    private String title;

    static final String LOCK_TIMEOUT = "jakarta.persistence.lock.timeout";
}
