package com.anteater.star.domain.wifi;

import lombok.Getter;
import lombok.Setter;

@Getter@Setter
public class WifiUser {
    private Integer id;
    private String username;
    private String attribute;
    private String op;
    private String value;
}
