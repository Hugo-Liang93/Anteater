package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.Set;

@Getter@Setter
public class House {
    private Long houseId;
    private String houseName;
    private String houseProvince;
    private String houseCity;
    private String houseDistrict;
    private String houseAddress;
    private Integer houseFloors;
    private Integer houseWithLift;
    //fk 外键需要一开始就创建在实体类中
    private Long houseOwnerId;
    private Owner houseOwner;
    private Set<Room> houseRoomSet;


}
