package com.anteater.star.service.wifiService.impl;

import com.anteater.star.dao.WifiUserDao;
import com.anteater.star.domain.wifi.WifiUser;
import com.anteater.star.service.wifiService.WifiUserServices;
import com.sun.xml.bind.v2.schemagen.xmlschema.Wildcard;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class WifiUserServicesImpl implements WifiUserServices {
    @Autowired
    WifiUserDao wifiUserDao;

    @Override
    public WifiUser checkUser(WifiUser wifiUser) {
        wifiUser = wifiUserDao.getUser(wifiUser);
        return wifiUser;
    }

    @Override
    public WifiUser addUser(WifiUser wifiUser) {
        return null;
    }
}
