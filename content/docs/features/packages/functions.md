---
title: "Pack template functions"
linkTitle: "Template functions"
weight: 3
description: "The functions available in pack templates: pack context, cluster queries, helpers and debugging functions, in addition to the Sprig library."
origin: "Nomad Pack v0.4.2 docs/functions.md (MPL 2.0, (c) HashiCorp, Inc.), modified"
---

The template renderer of `norca pack` provides helper functions for use in pack templates (with the
`[[ ]]` delimiters).

All the [Sprig template functions](https://masterminds.github.io/sprig/) are available for text
manipulation, data conversion and more. On top of them, `norca pack` provides functions to read the
pack's variables and metadata, to query the cluster, helpers, and functions for debugging templates.

## Functions by topic

- [Pack context](#pack-context)
- [Nomad API](#nomad-api) (cluster queries)
- [Helpers](#helpers)
- [Debugging](#debugging)

There is also an [alphabetical list](#alphabetical-list-of-functions) of all functions.

## Pack context

The template context `.` holds the variables and metadata of the pack being rendered, and the
contexts of its dependencies under their names (`.demo_dep`). These functions take a context as
their last argument.

### `var`

Returns the value of a variable; nested values are addressed with dots (`"resources.cpu"`). A
missing variable yields an empty string.

```plaintext
count = [[ var "count" . ]]
cpu   = [[ var "resources.cpu" . ]]
```

### `must_var`

Like `var`, but fails the rendering if the variable does not exist.

### `vars`

Returns the map of all variables of the pack.

```plaintext
[[ range $name, $value := vars . ]][[ $name ]] = [[ $value ]]
[[ end ]]
```

### `meta`, `must_meta`, `metas`

Return one metadata value (`meta "pack.name" .`, `meta "pack.version" .`, `meta "app.url" .`), fail
on a missing key (`must_meta`), or return the whole metadata map (`metas`).

```plaintext
job [[ coalesce (var "job_name" .) (meta "pack.name" .) | quote ]] {
```

### `deps`, `deps_tree`

`deps .` returns the contexts of the direct dependencies, keyed by name or alias; `deps_tree .`
returns the paths of all dependencies (`.dep`, `.dep.subdep`, ...).

### `fileRelative`

Reads a file relative to the pack directory and returns its contents.

```plaintext
[[ fileRelative "files/app.conf" . ]]
```

## Nomad API

These functions query the cluster the command is connected to. They are available when `norca pack`
has a client for the cluster.

### `nomadNamespace`

Returns the details of the namespace with the given name.

> [!NOTE]
> `nomadNamespace` fails on missing namespaces, which stops the rendering. Use namespace names
> returned by `nomadNamespaces` for additional safety.

#### Parameters

- 1: `string` - The name of the namespace

#### Returns

- `error`, or the namespace (`*api.Namespace`, as returned by the
  [namespace API](/docs/api/namespaces)).

#### Example

Print the name and description of each namespace the current token can see:

```plaintext
[[ range $ns := nomadNamespaces ]]
    [[ with nomadNamespace $ns.Name ]]
      [[ printf "%s: %s\n" .Name .Description ]]
    [[ end ]]
[[ end ]]
```

### `nomadNamespaces`

Returns the list of namespaces visible to the current token.

#### Parameters

- None

#### Returns

- `error`, or a list of namespaces (`[]*api.Namespace`).

#### Example

```plaintext
[[- range nomadNamespaces -]]
    [[- printf "%v: %v\n" .Name .Description -]]
[[- end -]]
```

```plaintext
default: Default shared namespace
```

### `nomadRegions`

Returns the names of the regions known to the cluster.

#### Parameters

- None

#### Returns

- `error`, or `[]string` containing the region names.

#### Example

```plaintext
[[ range nomadRegions ]][[ . ]]
[[ end ]]
```

```plaintext
eu-1
eu-2
```

## Helpers

### `fileContents`

Imports the contents of a file on the local file system into the template. The path is relative to
the directory `norca pack` is invoked in; the file is read when the template is rendered.

#### Parameters

- 1: `string` - The path of the file to read.

#### Returns

- The contents of the file.

#### Example

```plaintext {filename="./assets/hello.txt"}
hello from file
```

Template:

```plaintext
**[[ fileContents "./assets/hello.txt" ]]**
```

Output:

```plaintext
**hello from file**
```

### `packPath`

Returns the path of the pack being rendered.

### `tpl`

Renders a template string with the current template context. This is useful to render templates
stored in variables, or to evaluate template expressions inside strings.

The function has access to the same functions and variables as the parent template, including all
Sprig functions and the functions on this page.

#### Parameters

- 1: `string` - The template string to render
- 2: `any` - The data context for the rendering (usually `.`, the current context)

#### Returns

- `string` - The rendered output
- `error` - Any error while parsing or executing the template

#### Example

Render a template stored in a variable:

```plaintext
[[ $tmpl := "Hello, [[ .name ]]!" -]]
[[ tpl $tmpl (dict "name" "World") ]]
```

Output:

```plaintext
Hello, World!
```

Render with pack variables using the `var` function:

```plaintext
[[ $greeting := "Deploying [[ var \"job_name\" . ]] to [[ var \"region\" . ]]" -]]
[[ tpl $greeting . ]]
```

Output:

```plaintext
Deploying my-job to us-west-1
```

### `toStringList`

Converts a list into an HCL/JSON style list of quoted strings, using Go's `%q` formatting for every
element.

#### Parameters

- 1: `[]any` - The list to convert.

#### Returns

- A string representation of the list.

#### Example

```plaintext
datacenters = [[ var "datacenters" . | toStringList ]]
```

Output, with `datacenters = ["dc1", "dc2"]`:

```plaintext
datacenters = ["dc1", "dc2"]
```

## Debugging

### `spewDump`

Returns a string representation of the given value, using `spew.Sdump` of the
[go-spew](https://pkg.go.dev/github.com/davecgh/go-spew/spew) package.

`Sdump` formats the value with newlines, indentation and additional debug information such as
complete types and all pointer addresses used to reach the final value. Compared to the `fmt`
package:

- pointers are dereferenced and followed;
- circular data structures are detected and handled;
- custom `Stringer`/`error` interfaces are invoked, including on unexported types;
- custom types that implement `Stringer`/`error` only on a pointer receiver are invoked when passing
  non-pointer values;
- byte arrays and slices are dumped like `hexdump -C`, with offsets, byte values in hex and ASCII
  output.

The configuration of the standard spew printer is:

```go
Indent: " "
MaxDepth: 0
DisableMethods: false
DisablePointerMethods: false
ContinueOnMethod: false
SortKeys: false
```

#### Parameters

- 1: `any` - The value to print

#### Returns

- A string representation of the value

#### Example

Dump the current context for debugging:

```plaintext
[[ spewDump . ]]
```

### `spewPrintf`

Returns a formatted string, using `spew.Sprintf`: like `printf`, with spew's formatting of the
values.

#### Parameters

- 1: `string` - The format
- 2...: `any` - The values

#### Returns

- The formatted string

#### Example

```plaintext
[[ spewPrintf "%+v" (vars .) ]]
```

### Custom spew printers

The following functions build a spew printer with its own configuration.

#### `customSpew`

Returns a new `spew.ConfigState` with the default configuration (`spew.NewDefaultConfig`). Capture it
in a template variable to use it:

```plaintext
[[ $cs := ( customSpew | withIndent "\t" ) ]][[ $cs.Sdump . ]]
```

The default configuration is the one of `spewDump` above.

#### `withIndent`

Sets `Indent`, the string used for each indentation level (one space by default).

- Parameters: 1: `string` - the indentation; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withIndent "  " ) ]][[ $cs.Sdump . ]]
```

#### `withMaxDepth`

Sets `MaxDepth`, the maximum number of levels to descend into nested data structures. The default,
`0`, means no limit. Circular data structures are detected, so this is only needed to limit deeply
nested structures.

- Parameters: 1: `int` - the depth; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withMaxDepth 2 ) ]][[ $cs.Sdump . ]]
```

#### `withDisableMethods`

Sets `DisableMethods`: whether `error` and `Stringer` interfaces are not invoked for types that
implement them.

- Parameters: 1: `bool`; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withDisableMethods true ) ]][[ $cs.Sdump . ]]
```

#### `withDisablePointerMethods`

Sets `DisablePointerMethods`: whether `error` and `Stringer` interfaces are not invoked on types that
only accept a pointer receiver when the current value is not a pointer.

- Parameters: 1: `bool`; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withDisablePointerMethods true ) ]][[ $cs.Sdump . ]]
```

#### `withDisablePointerAddresses`

Sets `DisablePointerAddresses`: whether pointer addresses are not printed. This is useful when
diffing data structures.

- Parameters: 1: `bool`; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withDisablePointerAddresses true ) ]][[ $cs.Sdump . ]]
```

#### `withDisableCapacities`

Sets `DisableCapacities`: whether the capacities of arrays, slices, maps and channels are not
printed. This is useful when diffing data structures.

- Parameters: 1: `bool`; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withDisableCapacities true ) ]][[ $cs.Sdump . ]]
```

#### `withContinueOnMethod`

Sets `ContinueOnMethod`: whether recursion continues after a custom `error` or `Stringer` interface
was invoked. The default, `false`, prints the result of the method and does not descend into the
internals of the type. It has no effect when methods are disabled.

- Parameters: 1: `bool`; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withContinueOnMethod true ) ]][[ $cs.Sdump . ]]
```

#### `withSortKeys`

Sets `SortKeys`: map keys are sorted before printing, for a deterministic, diffable output. Native
types and types that implement `error` or `Stringer` (if methods are enabled) are sorted by value,
other types by their `reflect.Value.String()` output.

- Parameters: 1: `bool`; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withSortKeys true ) ]][[ $cs.Sdump . ]]
```

#### `withSpewKeys`

Sets `SpewKeys`: as a last resort, map keys are converted to strings with spew and sorted by those
strings. Only considered if `SortKeys` is true.

- Parameters: 1: `bool`; 2: the printer from `customSpew`
- Returns: the modified printer

```plaintext
[[ $cs := ( customSpew | withSortKeys true | withSpewKeys true ) ]][[ $cs.Sdump . ]]
```

## Alphabetical list of functions

These are the functions `norca pack` adds to the Go template and Sprig functions.

| Function | Description |
| --- | --- |
| [`customSpew`](#customspew) | Returns a new spew printer with the default configuration |
| [`deps`](#deps-deps_tree) | Returns the contexts of the direct dependencies |
| [`deps_tree`](#deps-deps_tree) | Returns the paths of all dependencies |
| [`fileContents`](#filecontents) | Returns the contents of a file, relative to the working directory |
| [`fileRelative`](#filerelative) | Returns the contents of a file, relative to the pack |
| [`meta`](#meta-must_meta-metas), [`metas`](#meta-must_meta-metas), [`must_meta`](#meta-must_meta-metas) | Read the pack metadata |
| [`must_var`](#must_var) | Returns a variable, fails if it does not exist |
| [`nomadNamespace`](#nomadnamespace) | Returns a namespace of the cluster |
| [`nomadNamespaces`](#nomadnamespaces) | Returns the namespaces of the cluster |
| [`nomadRegions`](#nomadregions) | Returns the regions of the cluster |
| [`packPath`](#packpath) | Returns the path of the pack being rendered |
| [`spewDump`](#spewdump) | Returns a string representation of a value (`spew.Sdump`) |
| [`spewPrintf`](#spewprintf) | Returns a formatted string (`spew.Sprintf`) |
| [`toStringList`](#tostringlist) | Converts a list into a list of quoted strings |
| [`tpl`](#tpl) | Renders a template string with the current context |
| [`var`](#var), [`vars`](#vars) | Read the pack variables |
| [`withContinueOnMethod`](#withcontinueonmethod) | Sets `ContinueOnMethod` of a custom spew printer |
| [`withDisableCapacities`](#withdisablecapacities) | Sets `DisableCapacities` of a custom spew printer |
| [`withDisableMethods`](#withdisablemethods) | Sets `DisableMethods` of a custom spew printer |
| [`withDisablePointerAddresses`](#withdisablepointeraddresses) | Sets `DisablePointerAddresses` of a custom spew printer |
| [`withDisablePointerMethods`](#withdisablepointermethods) | Sets `DisablePointerMethods` of a custom spew printer |
| [`withIndent`](#withindent) | Sets the indentation of a custom spew printer |
| [`withMaxDepth`](#withmaxdepth) | Sets the maximum depth of a custom spew printer |
| [`withSortKeys`](#withsortkeys) | Sets `SortKeys` of a custom spew printer |
| [`withSpewKeys`](#withspewkeys) | Sets `SpewKeys` of a custom spew printer |

---

Origin: adapted from `docs/functions.md` of Nomad Pack v0.4.2 (MPL 2.0, (c) HashiCorp, Inc.),
modified for Norca (the pack context functions were added, the examples corrected and the list of
functions aligned with the code).
