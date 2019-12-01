package com.anteater.star.dao.impl;

import com.anteater.star.dao.RenterDao;
import com.anteater.star.domain.Renter;
import org.springframework.orm.hibernate5.support.HibernateDaoSupport;
import org.springframework.transaction.annotation.Transactional;

@Transactional
public class RenterDaoImpl extends HibernateDaoSupport implements RenterDao {
    @Override
    public void save(Renter renter) {
        this.getHibernateTemplate().save(renter);
    }
}
