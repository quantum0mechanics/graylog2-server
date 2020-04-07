package org.graylog2;
import org.junit.Test;
import static org.assertj.core.api.Assertions.assertThat;
import java.util.*;
public class MyTest{
    @Test
    public void owntest()
    {
        HashSet<Integer> test = new HashSet<Integer>();
        test.add(1);
	    test.add(2);
        assertThat(test.toString()).isEqualTo("[1, 2]");
    }
}

