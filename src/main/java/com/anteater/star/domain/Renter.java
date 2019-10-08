package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Setter@Getter
public class Renter {
    private int renterId;
    private String renterName;
    private String renterProvince;
    private String renterCity;
    private String renterAge;
    private String renterSex;
    private String renterIdCardNum;
    private String renterIdCardAddress;
    private String renterPhone;
    private String renterPic;
    private String renterJob;
    private int renterDeposit;
    private int renterIsMarried;

    private Set<Room> renterRooms;
}
