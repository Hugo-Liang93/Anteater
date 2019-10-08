import com.anteater.star.domain.House;
import com.anteater.star.domain.Owner;
import com.anteater.star.domain.Renter;
import com.anteater.star.domain.Room;
import com.anteater.star.utils.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.Transaction;
import org.junit.Test;

import java.util.HashSet;


public class test {

    @Test
    public void test2(){
        //更新操作如果没有其他值会全部设置Null 解决办法 先将数据查出来再进行操作
        Session session = HibernateUtil.openSession();
        Transaction transaction = session.beginTransaction();

        House house = new House();
        House house1 = new House();
        House house2 = new House();
        house.setHouseName("hugo1");
        house1.setHouseName("hugo2");
        house2.setHouseName("hugo3");

        Owner owner = new Owner();
        Owner owner1 = new Owner();
        owner.setOwnerName("owner1");
        owner1.setOwnerName("owner2");

        owner.setOwnerHouseSet(new HashSet<House>());
        owner1.setOwnerHouseSet(new HashSet<House>());

        owner.getOwnerHouseSet().add(house);
        owner1.getOwnerHouseSet().add(house1);
        owner1.getOwnerHouseSet().add(house2);


        session.save(owner);
        session.save(owner1);
//        session.save(house);
//        session.save(house1);
//        session.save(house2);

        transaction.commit();
        session.close();
    }

    @Test
    public void test3(){
        Session session = HibernateUtil.openSession();
        Transaction transaction = session.beginTransaction();

        House house = session.get(House.class,1);

        transaction.commit();
        session.close();
        System.out.println(house.getHouseOwner().getOwnerName());
    }

    @Test
    public void test4(){
        Session session = HibernateUtil.openSession();
        Transaction transaction = session.beginTransaction();

        Room room =new Room();
        room.setRoomName("yagang1");
        Room room1 =new Room();
        room1.setRoomName("yagang2");
        Room room2 =new Room();
        room2.setRoomName("yagang3");

        Renter renter = new Renter();
        renter.setRenterName("hugo");
        Renter renter1 = new Renter();
        renter1.setRenterName("hugo1");

        renter.setRenterRooms(new HashSet<Room>());
        renter.getRenterRooms().add(room);
        renter.getRenterRooms().add(room1);
        renter1.setRenterRooms(new HashSet<Room>());
        renter1.getRenterRooms().add(room1);
        renter1.getRenterRooms().add(room2);

        session.save(room);
        session.save(room1);
        session.save(room2);

        session.save(renter);
        session.save(renter1);

        transaction.commit();
        session.close();
    }
}
