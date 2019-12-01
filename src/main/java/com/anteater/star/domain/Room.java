package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.Set;

@Getter@Setter
public class Room {
    private Long roomId;
    private String roomName;
    //单间或套间
    private String roomType;
    private Integer roomFloor;
    private Integer roomStatus;
    private String roomContract;
    //是否具有空调
    private String roomFacility;
    //fk
    //house
    private Long roomHouseId;

    //many to one object
    private House roomHouse;

    //bill many to many
    private Set<Bill> roomBillSet;
    //Renter
    private Set<Renter> roomRenters;
}
