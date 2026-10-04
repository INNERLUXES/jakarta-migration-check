package com.larkspur.books.crypto;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import javax.net.ssl.SSLContext;
import javax.security.auth.Subject;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.TransformerFactory;
import javax.annotation.processing.Processor;

// Only packages of the JDK: none of them moved to jakarta.
public class Signer {
    Cipher cipher;
    SecretKeySpec key;
    SSLContext tls;
    Subject subject;
    DocumentBuilderFactory documents = DocumentBuilderFactory.newInstance();
    TransformerFactory transforms = javax.xml.transform.TransformerFactory.newInstance();
    Processor processor;
}
