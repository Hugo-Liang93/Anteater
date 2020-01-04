package com.anteater.star.controller.impl;

import com.anteater.star.controller.userEnterController;
import com.anteater.star.domain.Owner;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class userEnterControllerImpl implements userEnterController {
    @RequestMapping("/login")
    @Override
    public void login(Owner owner) {
        System.out.println("User is logining now!!!");
    }

    @RequestMapping("test")
    @ResponseBody
    public Owner test() {
        Owner owner = new Owner();
        owner.setOwnerName("hugo");
        System.out.println("hello");
        return owner;
    }
}
