/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.utils;

import glide.api.models.GlideString;
import java.util.ArrayList;
import java.util.Map;

/**
 * Helper class for collecting arbitrary type of arguments and stores them as an array of
 * GlideString
 */
public class ArgsBuilder {
    ArrayList<GlideString> argumentsList = null;

    public ArgsBuilder() {
        argumentsList = new ArrayList<>();
    }

    public <ArgType> ArgsBuilder add(ArgType[] args) {
        for (ArgType arg : args) {
            argumentsList.add(GlideString.of(arg));
        }

        return this;
    }

    public <ArgType> ArgsBuilder add(ArgType arg) {
        argumentsList.add(GlideString.of(arg));
        return this;
    }

    /** Append args to the list of argument only if condition is true */
    public <ArgType> ArgsBuilder addIf(ArgType[] args, boolean condition) {
        if (condition) {
            for (ArgType arg : args) {
                argumentsList.add(GlideString.of(arg));
            }
        }
        return this;
    }

    /** Append arg to the list of argument only if condition is true */
    public <ArgType> ArgsBuilder addIf(ArgType arg, boolean condition) {
        if (condition) {
            argumentsList.add(GlideString.of(arg));
        }
        return this;
    }

    public ArgsBuilder add(String[] args) {
        for (String arg : args) {
            argumentsList.add(GlideString.of(arg));
        }
        return this;
    }

    public ArgsBuilder add(int[] args) {
        for (int arg : args) {
            argumentsList.add(GlideString.of(arg));
        }
        return this;
    }

    public GlideString[] toArray() {
        return argumentsList.toArray(new GlideString[0]);
    }

    public static <ArgType> void checkTypeOrThrow(ArgType arg) {
        if ((arg instanceof String) || (arg instanceof GlideString)) {
            return;
        }
        throw new IllegalArgumentException("Expected String or GlideString");
    }

    public static <ArgType> void checkTypeOrThrow(ArgType[] args) {
        if (args.length == 0) {
            // nothing to check here
            return;
        }
        checkTypeOrThrow(args[0]);
    }

    public static <ArgType> void checkTypeOrThrow(Map<ArgType, ArgType> argsMap) {
        if (argsMap.isEmpty()) {
            // nothing to check here
            return;
        }

        var arg = argsMap.keySet().iterator().next();
        checkTypeOrThrow(arg);
    }

    public static ArgsBuilder newArgsBuilder() {
        return new ArgsBuilder();
    }
}
