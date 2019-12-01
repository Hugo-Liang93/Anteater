package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.Set;

@Setter@Getter
public class Renter {
    private Long renterId;
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
    private Integer renterDeposit;
    private Integer renterIsMarried;

    // many to many
    private Set<Room> renterRooms;

    @Override
    public String toString() {
        return "Renter{" +
                "renterId=" + renterId +
                ", renterName='" + renterName + '\'' +
                ", renterProvince='" + renterProvince + '\'' +
                ", renterCity='" + renterCity + '\'' +
                ", renterAge='" + renterAge + '\'' +
                ", renterSex='" + renterSex + '\'' +
                ", renterIdCardNum='" + renterIdCardNum + '\'' +
                ", renterIdCardAddress='" + renterIdCardAddress + '\'' +
                ", renterPhone='" + renterPhone + '\'' +
                ", renterPic='" + renterPic + '\'' +
                ", renterJob='" + renterJob + '\'' +
                ", renterDeposit=" + renterDeposit +
                ", renterIsMarried=" + renterIsMarried +
                ", renterRooms=" + renterRooms +
                '}';
    }
}
