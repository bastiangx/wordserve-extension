```xml
<ruleset>
  <rule name="Summaries">
    <description>
      Claude will not provide verbose summaries for code changes or completed
      features. Instead, Claude will acknowledge the status of a given todo
      list with simple, direct phrases and continue working until all tasks
      are complete.
    </description>
    <context>
      This rule applies if Claude detects it is working on a personal git
      repository, a project without explicit git context, or a project named
      "typer" (either the core library or the Obsidian plugin).
    </context>
    <examples>
      <success>"todo done"</success>
      <partial>"tasks partially done"</partial>
      <failure>"todo not done" or "todo failed"</failure>
    </examples>
    <action>Avoid verbose summaries on personal projects.</action>
    <condition>Agent mode is active.</condition>
  </rule>

  <rule name="FunctionNaming">
    <description>
      Claude will name functions, methods, classes, and packages with
      sensible, general names that reflect their core functionality and are
      reusable. Names should be simple and self-explanatory within the
      codebase's context.
    </description>
    <guidelines>
      <good>
        Names should describe what the function does or returns.
        <example>should_cache() -> bool</example>
        <example>cache_timeout() -> int</example>
      </good>
      <bad>
        Avoid names tightly coupled to a specific, transient task.
        <example>hot_cache_logic()</example>
        <example>hot_cache_lru()</example>
      </bad>
    </guidelines>
    <action>Use sensible and context-aware function names.</action>
    <condition>Agent mode is active.</condition>
  </rule>

  <rule name="CommentingStyle">
    <description>
      Claude will avoid verbose comments and inline comments for trivial
      values. Comments should only be used when essential to explain complex
      or "fat" functions, intricate interactions, or code that is not
      self-explanatory. Simple one-liners or short functions should not be
      commented.
    </description>
    <action>Avoid verbose and unnecessary comments.</action>
    <condition>Agent mode is active.</condition>
  </rule>

  <rule name="PackageManager">
    <description>
      Claude will use 'bun' as the default package manager for running scripts
      and managing dependencies.
    </description>
    <context>
      This rule applies to frontend projects or any project utilizing npm
      packages, TypeScript dependencies, Svelte, or React.
    </context>
    <action>Use 'bun' instead of 'npm', 'pnpm', or 'yarn'.</action>
    <condition>Agent mode is active.</condition>
  </rule>
</ruleset>
```

```xml
<ruleset name="ObsidianPluginDevelopment">
<!-- This entire ruleset applies ONLY under the following conditions -->
<context>
  <description>
    This ruleset is activated if Claude determines the project is an Obsidian
    plugin OR is the project named 'typer'.
  </description>
  <activation>
    <or>
      <condition name="is_obsidian_plugin">
        Project contains a 'manifest.json' file and/or imports from the
        'obsidian' package.
      </condition>
      <condition name="is_typer_project">
        The project name or root directory is 'typer'.
      </condition>
    </or>
  </activation>
</context>
  <!-- General Plugin Development Guidelines -->
  <category name="General">
    <rule name="UseInstanceApp">
      <description>
        Claude will avoid using the global `app` or `window.app` object.
        Instead, Claude must use the `this.app` reference provided by the
        plugin's class instance.
      </description>
      <reason>
        The global `app` object is for debugging and may be removed in future
        Obsidian versions, leading to breaking changes.
      </reason>
      <guidelines>
        <good>this.app.workspace.getActiveViewOfType(MarkdownView);</good>
        <bad>app.workspace.getActiveViewOfType(MarkdownView);</bad>
      </guidelines>
      <action>Use `this.app` instead of the global `app`.</action>
    </rule>

    <rule name="AvoidUnnecessaryLogging">
      <description>
        Claude will not add console logging (e.g., `console.log`,
        `console.debug`) in the plugin's default configuration. The developer
        console should remain clean and only show error messages.
      </description>
      <action>Limit console output to critical errors only.</action>
    </rule>

    <rule name="OrganizeCodebase">
      <description>
        If a plugin's codebase consists of more than one TypeScript file,
        Claude will organize the files into a structured folder hierarchy to
        improve maintainability and ease of review.
      </description>
      <action>Use folders for multi-file plugin projects.</action>
    </rule>

    <rule name="RenamePlaceholders">
      <description>
        Claude will rename placeholder class names from the sample plugin, such
        as `MyPlugin`, `MyPluginSettings`, and `SampleSettingTab`, to names
        that are specific and relevant to the plugin being developed.
      </description>
      <action>Replace all placeholder names with plugin-specific names.</action>
    </rule>
  </category>

  <!-- Settings Tab UI/UX -->
  <category name="SettingsUI">
    <rule name="UseConditionalHeadings">
      <description>
        Claude will only add headings to a settings tab if there is more than
        one distinct section of settings. A top-level heading like "General" or
        the plugin's name is to be avoided.
      </description>
      <action>Only use settings headings for multiple sections.</action>
    </rule>

    <rule name="AvoidRedundantHeadings">
      <description>
        When creating headings in the settings tab, Claude will avoid including
        the word "settings" as it is redundant.
      </description>
      <guidelines>
        <good>Prefer "Advanced" or "Templates".</good>
        <bad>Avoid "Advanced settings" or "Settings for templates".</bad>
      </guidelines>
      <action>Omit the word "settings" from settings tab headings.</action>
    </rule>

    <rule name="UseSentenceCase">
      <description>
        Claude will use Sentence case for all text in UI elements, not Title
        Case. Only the first word and proper nouns should be capitalized.
      </description>
      <guidelines>
        <good>Prefer "Template folder location".</good>
        <bad>Avoid "Template Folder Location".</bad>
      </guidelines>
      <action>Apply sentence case to all UI text.</action>
    </rule>

    <rule name="UseSetHeading">
      <description>
        To create headings in settings, Claude will use the `setHeading()`
        method on a `Setting` instance rather than creating raw HTML heading
        elements (`h1`, `h2`, etc.).
      </description>
      <reason>
        This ensures consistent styling that respects the user's current theme.
      </reason>
      <guidelines>
        <good>new Setting(containerEl).setName('My Heading').setHeading();</good>
        <bad>containerEl.createEl('h1', { text: 'My Heading' });</bad>
      </guidelines>
      <action>Use `.setHeading()` for settings titles.</action>
    </rule>
  </category>

  <!-- Security Best Practices -->
  <category name="Security">
    <rule name="AvoidInnerHTML">
      <description>
        Claude must avoid using `innerHTML`, `outerHTML`, and
        `insertAdjacentHTML` to build DOM elements from user-defined input, as
        this poses a significant XSS security risk.
      </description>
      <reason>
        These properties can execute arbitrary scripts if the input is not
        sanitized.
      </reason>
      <guidelines>
        <good>
          Use DOM APIs like `createEl()`, `createDiv()`, or `el.empty()` to
          programmatically build and clean elements.
        </good>
        <bad>containerElement.innerHTML = `&lt;div&gt;${name}&lt;/div&gt;`;</bad>
      </guidelines>
      <action>Never use `innerHTML` with user input.</action>
    </rule>
  </category>

  <!-- Resource and Lifecycle Management -->
  <category name="ResourceManagement">
    <rule name="CleanupOnUnload">
      <description>
        Claude will ensure all resources created by the plugin (e.g., event
        listeners, intervals, DOM elements outside its own containers) are
        destroyed or released in the `onunload` method. Claude will prefer
        methods like `registerEvent()` which handle this cleanup automatically.
      </description>
      <action>Register all events and resources for automatic cleanup.</action>
    </rule>

    <rule name="AvoidDetachingLeaves">
      <description>
        Claude will not detach leaves in the `onunload` method. Doing so
        disrupts the user's workspace layout when the plugin is updated.
      </description>
      <action>Do not call `leaf.detach()` in `onunload`.</action>
    </rule>
  </category>

  <!-- Command Implementation -->
  <category name="Commands">
    <rule name="AvoidDefaultHotkeys">
      <description>
        Claude will not set a default hotkey for plugin commands to avoid
        conflicts with user-configured hotkeys or other plugins.
      </description>
      <action>Do not assign default hotkeys to commands.</action>
    </rule>

    <rule name="UseCorrectCallbackType">
      <description>
        Claude will use the appropriate callback type when adding a command:
        `callback` for unconditional commands, `checkCallback` for conditional
        commands, and `editorCallback` or `editorCheckCallback` for commands
        requiring an active Markdown editor.
      </description>
      <action>Select the correct command callback type based on context.</action>
    </rule>
  </category>

  <!-- Workspace API Usage -->
  <category name="Workspace">
    <rule name="UseGetActiveViewOfType">
      <description>
        To access the active view, Claude will use
        `this.app.workspace.getActiveViewOfType(ViewType)` instead of accessing
        `workspace.activeLeaf` directly.
      </description>
      <reason>
        This is a safer way to ensure the active view is of the expected type
        and is not null.
      </reason>
      <action>Use `getActiveViewOfType()` to get the active view.</action>
    </rule>

    <rule name="UseActiveEditor">
      <description>
        To access the editor in the active note, Claude will use
        `this.app.workspace.activeEditor?.editor`.
      </description>
      <action>Use `activeEditor` property for editor access.</action>
    </rule>

    <rule name="AvoidStoringViewReferences">
      <description>
        Claude will not store a direct reference to a custom view instance
        within the plugin class. Instead, it will retrieve the view instance
        when needed using `app.workspace.getActiveLeavesOfType()`.
      </description>
      <reason>
        Storing references can lead to memory leaks and unintended side
        effects.
      </reason>
      <action>Retrieve view instances on-demand; do not store them.</action>
    </rule>
  </category>

  <!-- Vault and File API Usage -->
  <category name="Vault">
    <rule name="PreferEditorAPI">
      <description>
        When modifying the currently active note, Claude will use the Editor
        API (`editor.replaceSelection`, etc.) instead of `Vault.modify()`.
      </description>
      <reason>
        The Editor API preserves cursor position, selection, and folding state,
        providing a better user experience. It is also more efficient.
      </reason>
      <action>Use Editor API for active file modifications.</action>
    </rule>

    <rule name="PreferVaultProcess">
      <description>
        When modifying a note that is not currently open (in the background),
        Claude will use `Vault.process()` instead of `Vault.modify()`.
      </description>
      <reason>
        `process()` is an atomic operation that prevents race conditions with
        other plugins modifying the same file.
      </reason>
      <action>Use `Vault.process()` for background file modifications.</action>
    </rule>

    <rule name="PreferProcessFrontMatter">
      <description>
        To modify a note's frontmatter, Claude will use the
        `FileManager.processFrontMatter()` function.
      </description>
      <reason>
        This is an atomic operation that ensures consistent YAML formatting and
        avoids conflicts.
      </reason>
      <action>Use `processFrontMatter()` for all frontmatter changes.</action>
    </rule>

    <rule name="PreferVaultAPIOverAdapter">
      <description>
        Claude will prefer the Vault API (`app.vault`) over the Adapter API
        (`app.vault.adapter`) for all file operations.
      </description>
      <reason>
        The Vault API is safer (serializes operations) and more performant (has
        a caching layer).
      </reason>
      <action>Use `app.vault` for file operations.</action>
    </rule>

    <rule name="UseGetFileByPath">
      <description>
        To find a file or folder by its path, Claude will use
        `Vault.getFileByPath()`, `Vault.getFolderByPath()`, or
        `Vault.getAbstractFileByPath()` instead of iterating through all files.
      </description>
      <reason>Iterating is highly inefficient, especially in large vaults.</reason>
      <action>Use direct path-based lookup methods, not iteration.</action>
    </rule>

    <rule name="UseNormalizePath">
      <description>
        Claude will use `normalizePath()` from the `obsidian` module whenever
        handling user-defined paths or constructing paths in code.
      </description>
      <reason>
        This function cleans paths for cross-platform compatibility and file
        system safety.
      </reason>
      <action>Always wrap path strings in `normalizePath()`.</action>
    </rule>
  </category>

  <!-- Editor Extension Management -->
  <category name="Editor">
    <rule name="UpdateEditorExtensions">
      <description>
        To change or reconfigure a registered editor extension, Claude will
        modify the extension array in-place (e.g., `myExtension.length = 0;
        myExtension.push(...)`) and then call `this.app.workspace.updateOptions()`
        to apply the changes to all editors.
      </description>
      <action>Modify extension array in-place and call `updateOptions()`.</action>
    </rule>
  </category>

  <!-- Typer's Autogen files -->
  <category name="Autogen">
    <rule name="NoAutogenChanges">
      <description>
      Claude will not make any changes to the autogenerated files in the
      `src/` folder where the autogen is indicated by the 
      top-level comment: "THIS FILE IS AUTO-GENERATED. DO NOT EDIT".
      </description>
      <example>
      <file>
      src/core/config.ts
      </file>
      <file>
      .../styles.css
      </file>
      </example>
      <reason>
        Autogen files are generated from 'scripts/init.ts' file for now for 
        ease of development and should not be modified directly.
      </reason>
      <action>Modify init.ts file and not the autogen files.</action>
    </rule>
  </category>


  <!-- Styling and CSS -->
  <category name="Styling">
    <rule name="NoHardcodedStyling">
      <description>
        Claude will not use hardcoded inline styles. Instead, it will apply
        CSS classes to elements and define the styles in a `styles.css` file.
        Styles should use Obsidian's CSS variables (e.g.,
        `var(--text-normal)`) for theme consistency.
      </description>
      <reason>
        Hardcoded styles cannot be overridden by user themes or CSS snippets.
      </reason>
      <action>Use CSS classes and variables, not inline styles.</action>
    </rule>
  </category>

  <!-- TypeScript and JavaScript Best Practices -->
  <category name="TypeScript">
    <rule name="PreferConstLet">
      <description>
        Claude will use `const` and `let` for variable declarations and will
        avoid using `var`.
      </description>
      <action>Use `const` and `let`, avoid `var`.</action>
    </rule>

    <rule name="PreferAsyncAwait">
      <description>
        Claude will prefer using `async/await` syntax for asynchronous
        operations over traditional Promise `.then()` and `.catch()` chains.
      </description>
      <reason>
        `async/await` produces more readable and maintainable asynchronous
        code.
      </reason>
      <action>Use `async/await` for all asynchronous code.</action>
    </rule>
  </category>
</ruleset>

<!-- Erros and Logs -->
<ruleset>
  <rule name="LoggingVsErrorCreation">
    <description>
      Claude must ensure that logging and error creation are treated as separate concerns. Logging is for debugging purposes, while errors are for proper error handling and flow control. This rule ensures that Claude does not conflate these two concerns in the codebase.
    </description>
    <guidelines>
      <good>
        <description>Correct approaches to logging and error handling:</description>
        <point>
          Log the error for debugging purposes and then return the actual error:
          <example>
            log.Errorf("failed: %v", err)
            return err
          </example>
        </point>
        <point>
          Log the error and create a new error with additional context:
          <example>
            log.Errorf("failed to load chunk %d: %v", chunkID, err)
            return fmt.Errorf("failed to load chunk %d: %w", chunkID, err)
          </example>
        </point>
        <point>
          Simple error handling with logging:
          <example>
            log.Errorf("failed: %v", err)
            return errors.New("simple description")
          </example>
        </point>
      </good>
      
      <bad>
        <description>Incorrect approaches to logging and error handling:</description>
        <point>
          Using log.Errorf as a replacement for proper error handling:
          <example>
            return log.Errorf("failed: %v", err)
          </example>
        </point>
      </bad>
    </guidelines>

    <best-practices>
      <description>Recommended patterns for error handling:</description>
      <point>
        For wrapped errors with context:
        <example>
          if err != nil {
            log.Errorf("failed to open file %s: %v", filename, err)
            return fmt.Errorf("failed to open file %s: %w", filename, err)
          }
        </example>
      </point>
      <point>
        For simple error cases:
        <example>
          if condition {
            log.Errorf("invalid condition: %v", value)
            return errors.New("invalid condition")
          }
        </example>
      </point>
    </best-practices>

    <rationale>
      <description>Reasons for this rule:</description>
      <point>Separation of concerns: Logging is for debugging, while errors are for control flow.</point>
      <point>Flexibility: Callers can choose how to handle errors.</point>
      <point>Error wrapping: Preserves the original error while adding context.</point>
      <point>Consistency: Maintains a uniform error handling pattern across the codebase.</point>
    </rationale>

    <action>
      Enforce proper separation of logging and error creation in the codebase.
    </action>
  </rule>
</ruleset>
