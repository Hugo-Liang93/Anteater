package com.anteater.star.domain.wedding;

import lombok.Getter;
import lombok.Setter;

@Getter@Setter
public class Guest {
    private Integer guest_id;
    private String guest_name;
    private Integer guest_num;
    private String guest_type;
    private String guest_table;
    private Integer guest_gift;
}
