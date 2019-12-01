package com.anteater.star.service.ownerService.impl;

import com.anteater.star.dao.HouseDao;
import com.anteater.star.domain.House;
import com.anteater.star.domain.Owner;
import com.anteater.star.service.ownerService.HouseService;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

public class HouseServiceImpl implements HouseService {
    @Autowired
    private HouseDao houseDao;
    @Override
    public List<House> getHouses(Owner owner) {
        return houseDao.getHouse(owner);
    }
}
