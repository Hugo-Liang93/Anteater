package com.anteater.star.service.wifiService;

import com.anteater.star.domain.wifi.WifiUser;

public interface WifiUserServices {
    public WifiUser checkUser(WifiUser wifiUser);
    public WifiUser addUser(WifiUser wifiUser);
}
