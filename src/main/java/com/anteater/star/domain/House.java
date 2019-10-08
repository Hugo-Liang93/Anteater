package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter@Setter
public class House {
    private int houseId;
    private String houseName;
    private String houseProvince;
    private String houseCity;
    private String houseDistrict;
    private String houseAddress;
    private int houseFloors;
    private int houseWithLift;
    //fk
    private int houseOwnerId;

    private Set<Room> houseRoomSet;

    private Owner houseOwner;
}
