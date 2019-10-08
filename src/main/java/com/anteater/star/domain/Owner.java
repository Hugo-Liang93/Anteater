package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter@Setter
public class Owner {
    private int ownerId;
    private String ownerName;
    private String ownerPhone;
    private Set<House> ownerHouseSet ;
}
