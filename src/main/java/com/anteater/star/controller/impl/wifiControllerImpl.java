package com.anteater.star.controller.impl;

import com.anteater.star.controller.wifiController;
import com.anteater.star.domain.wifi.WifiAP;
import com.anteater.star.domain.wifi.WifiUser;
import com.anteater.star.service.wifiService.WifiUserServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class wifiControllerImpl implements wifiController {
    @Autowired
    WifiUserServices wifiUserServices;

    @RequestMapping("/wifiLogin")
    @ResponseBody
    @Override
    public WifiUser wifiLogin(WifiUser wifiUser,Model model) {
        System.out.println("====");
        wifiUser =wifiUserServices.checkUser(wifiUser);
        return wifiUser;
    }

    @RequestMapping("/access")
    @Override
    public ModelAndView wifiAccess(WifiAP wifiAP, ModelAndView modelAndView) {
        modelAndView.setViewName("/wifiLogin");
        return modelAndView;
    }
}
