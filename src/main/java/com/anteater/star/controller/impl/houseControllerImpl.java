package com.anteater.star.controller.impl;

import com.anteater.star.controller.houseController;
import com.anteater.star.domain.House;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class houseControllerImpl implements houseController {
    @RequestMapping("first")
    @ResponseBody
    public House show(){
        House house =new House();
        house.setHouseName("hugo");
        return house;
    }
}
