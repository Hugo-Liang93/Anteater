package com.anteater.star.domain.wifi;

import lombok.Getter;
import lombok.Setter;

@Getter@Setter
public class WifiAP {
    private String pagetype;
    private String vlan;
    private String staMac;
    private String staIp;
    private String apMac;
    private String apIp;
}
