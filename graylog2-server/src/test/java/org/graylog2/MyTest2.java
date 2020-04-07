/**
 * This file is part of Graylog.
 *
 * Graylog is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Graylog is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Graylog.  If not, see <http://www.gnu.org/licenses/>.
 */
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

