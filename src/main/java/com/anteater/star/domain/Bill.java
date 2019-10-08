package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Getter@Setter
public class Bill {
    private int billId;
    private String billYear;
    private String billMonth;
    private String billDate;
    private Double billWaterNum;
    private Double billElectricNum;
    private Double billWaterRate;
    private Double billElectricRate;
    private Double billNet;
    private Double billRubbish;
    private Double billOther;
    //Check the bill is pay or not.
    private int billIsPay;
    private Date billPayDate;
    private String billPayWay;
    //fk
    private String billRoomId;
    private Room billRoom;
}
