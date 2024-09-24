/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.api.models.commands;

import glide.api.commands.ScriptingAndFunctionsClusterCommands;
import glide.api.models.GlideString;
import glide.api.models.Script;
import java.util.List;
import lombok.Getter;
import lombok.Singular;
import lombok.experimental.SuperBuilder;

/**
 * Optional arguments for {@link ScriptingAndFunctionsClusterCommands#invokeScript(Script,
 * ScriptArgOptionsGlideString)} command.
 *
 * @see <a href="https://valkey.io/commands/evalsha/">valkey.io</a>
 */
@SuperBuilder
public class ScriptArgOptionsGlideString {

    /** The arguments for the script. */
    @Singular @Getter private final List<GlideString> args;
}
