package com.anteater.star.dao;

import com.anteater.star.domain.wifi.WifiUser;
import org.springframework.stereotype.Repository;

import java.util.List;

public interface WifiUserDao {
    public WifiUser getUser(WifiUser wifiUser);
    public void addUser(WifiUser wifiUser);
    public List<WifiUser> getAll();
}
