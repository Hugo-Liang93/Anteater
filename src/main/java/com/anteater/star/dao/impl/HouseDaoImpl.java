package com.anteater.star.dao.impl;

import com.anteater.star.dao.HouseDao;
import com.anteater.star.domain.House;
import com.anteater.star.domain.Owner;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository("houseDao")
public class HouseDaoImpl implements HouseDao {
    @Override
    public List<House> getHouse(Owner owner) {
        return null;
    }
}
