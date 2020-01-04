package com.anteater.star.utils;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.persistence.criteria.CriteriaBuilder;

@Component
public class HibernateUtil {
    @Autowired
    SessionFactory sessionFactory;

    private CriteriaBuilder builder;
    private Session session;

    public CriteriaBuilder getBuilder() {
        return sessionFactory.getCurrentSession().getCriteriaBuilder();
    }

    public void setBuilder(CriteriaBuilder builder) {
        this.builder = builder;
    }

    public void setSession(Session session) {
        this.session = session;
    }

    public Session getSession() {
        return sessionFactory.getCurrentSession();
    }

}
