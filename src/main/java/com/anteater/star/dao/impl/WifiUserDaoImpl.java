package com.anteater.star.dao.impl;

import com.anteater.star.dao.WifiUserDao;
import com.anteater.star.domain.wifi.WifiUser;
import com.anteater.star.utils.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import java.util.List;

@Repository@Transactional
public class WifiUserDaoImpl implements WifiUserDao {
    @Autowired
    HibernateUtil hibernateUtil;

    @Override
    public WifiUser getUser(WifiUser wifiUser) {
        CriteriaBuilder builder = hibernateUtil.getBuilder();
        CriteriaQuery<WifiUser> query = builder.createQuery(WifiUser.class);
        Root<WifiUser> root = query.from(WifiUser.class);
        Predicate id = builder.equal(root.get("id"),"1");
        query.select(root);
        query.where(id);
        wifiUser= hibernateUtil.getSession().createQuery(query).uniqueResult();
        return wifiUser;
    }

    @Override
    public void addUser(WifiUser wifiUser) {

    }

    @Override
    public List<WifiUser> getAll() {
        return null;
    }
}
