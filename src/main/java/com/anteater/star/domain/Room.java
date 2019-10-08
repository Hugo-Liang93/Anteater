package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter@Setter
public class Room {
    private int roomId;
    private String roomName;
    //单间或套间
    private String roomType;
    private int roomFloor;
    private int roomStatus;
    private String roomContract;
    //是否具有空调
    private String roomFacility;
    //fk
    //house
    private int roomHouseId;
    private House roomHouse;
    //bill
    private Set<Bill> roomBillSet;
    //Renter
    private Set<Renter> roomRenters;
}
