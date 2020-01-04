package com.anteater.star.controller;

import com.anteater.star.domain.wifi.WifiAP;
import com.anteater.star.domain.wifi.WifiUser;
import org.springframework.ui.Model;
import org.springframework.web.servlet.ModelAndView;

public interface wifiController {
    public WifiUser wifiLogin(WifiUser wifiUser,Model model);
    public ModelAndView wifiAccess(WifiAP wifiAP, ModelAndView modelAndView);
}
