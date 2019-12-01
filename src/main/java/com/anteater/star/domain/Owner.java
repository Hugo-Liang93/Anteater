package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter@Setter
public class Owner{
    private Long ownerId;
    private String ownerName;
    private String ownerPhone;
    // 一对多关系配置
    private Set<House> ownerHouseSet;

    @Override
    public String toString() {
        return "Owner{" +
                "ownerId=" + ownerId +
                ", ownerName='" + ownerName + '\'' +
                ", ownerPhone='" + ownerPhone + '\'' +
                ", ownerHouseSet=" + ownerHouseSet +
                '}';
    }
}
