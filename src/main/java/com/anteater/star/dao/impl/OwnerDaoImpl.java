package com.anteater.star.dao.impl;

import com.anteater.star.dao.OwnerDao;
import com.anteater.star.domain.Owner;
import org.springframework.orm.hibernate5.support.HibernateDaoSupport;
import org.springframework.transaction.annotation.Transactional;

@Transactional
public class OwnerDaoImpl extends HibernateDaoSupport implements OwnerDao {
    @Override
    public void save(Owner owner) {
        System.out.println(owner);
        this.getHibernateTemplate().save(owner);
    }
}
