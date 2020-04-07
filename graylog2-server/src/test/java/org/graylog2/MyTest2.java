package org.graylog2;
import org.junit.Test;
import java.util.*;
public class MyTest2{
    @Test
    public void owntest()
    {
        HashSet<Object> test = new HashSet<Object>();
        test.add(null);
        test.add("123 ");
        Iterator iter = test.iterator();
        iter.next();
        System.out.println(((String)(iter.next())).trim()); // if iter.next() is null, will throw NPE
    }
}

