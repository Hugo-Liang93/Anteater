package com.anteater.star.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.Date;

@Getter@Setter
public class Bill {
    private Long billId;
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
    private Long billIsPay;
    private Date billPayDate;
    private String billPayWay;
    //fk
    private String billRoomId;
    
    private Room billRoom;
}
