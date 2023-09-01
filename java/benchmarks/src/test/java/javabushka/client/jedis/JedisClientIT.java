/*
 * This Java source file was generated by the Gradle 'init' task.
 */
package javabushka.client.jedis;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Before;
import org.junit.Test;

public class JedisClientIT {

    JedisClient jedisClient;

    @Before
    public void initializeJedisClient() {
        jedisClient = new JedisClient();
        jedisClient.connectToRedis();
    }

    @Test public void someLibraryMethodReturnsTrue() {
        JedisClient classUnderTest = new JedisClient();
        assertTrue("someLibraryMethod should return 'true'", classUnderTest.someLibraryMethod());
    }

    @Test public void testResourceInfo() {
        String result = jedisClient.info();

        assertTrue(result.length() > 0);
    }

    @Test public void testResourceInfoBySection() {
        String section = "Server";
        String result = jedisClient.info(section);

        assertTrue(result.length() > 0);
        assertTrue(result.startsWith("# " + section));
    }

    @Test public void testResourceSetGet() {
        String key = "name";
        String value = "my-value";

        jedisClient.set(key, value);
        String result = jedisClient.get(key);

        assertEquals(value, result);
    }
}
