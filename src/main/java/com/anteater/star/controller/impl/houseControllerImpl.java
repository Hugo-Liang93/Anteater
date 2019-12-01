package com.anteater.star.controller.impl;

import com.anteater.star.controller.houseController;
import com.anteater.star.dao.OwnerDao;
import com.anteater.star.dao.RenterDao;
import com.anteater.star.dao.impl.OwnerDaoImpl;
import com.anteater.star.domain.House;
import com.anteater.star.domain.Owner;
import com.anteater.star.domain.Renter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.UnsupportedEncodingException;

@Controller
public class houseControllerImpl implements houseController {
    @Autowired
    OwnerDao ownerDao;
    @Autowired
    RenterDao renterDao;

    @RequestMapping("first1")
    @ResponseBody
    public House show(){
        House house =new House();
        house.setHouseName("hugo");
        return house;
    }

    @RequestMapping("first")
    @ResponseBody
    public void show1(@RequestBody Renter renter) throws UnsupportedEncodingException {
        renterDao.save(renter);
    }
}
