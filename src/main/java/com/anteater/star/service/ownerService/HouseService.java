package com.anteater.star.service.ownerService;

import com.anteater.star.domain.House;
import com.anteater.star.domain.Owner;

import java.util.List;

public interface HouseService {
    public List<House> getHouses(Owner owner);
}
