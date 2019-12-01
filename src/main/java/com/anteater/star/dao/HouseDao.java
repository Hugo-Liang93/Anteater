package com.anteater.star.dao;

import com.anteater.star.domain.House;
import com.anteater.star.domain.Owner;

import java.util.List;

public interface HouseDao {
    public List<House> getHouse(Owner owner);
}
