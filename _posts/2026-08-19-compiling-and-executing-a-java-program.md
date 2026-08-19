---
title: "Compiling and Executing a Java Program"
date: 2026-08-19
tags: [java, technical, csf213]
description: "How javac and java build and run a Java program"
---

Every Java project you will ever work with, whether it is built by an IDE, Code Runner,
Maven, or Gradle, ultimately does two things with command-line tools. Learn to do them
by hand and the abstractions become understandable.

```text
javac   the compiler    .java source  ->  .class bytecode
java    the launcher    loads .class files into the JVM and runs the program
```

The two steps behave differently, and that difference is the source of most beginner
errors. Compilation is a path-aware translation step. At runtime, classes are linked by
name only. Everything below follows from that split.

All outputs in this post are real. They were produced with OpenJDK 21, `javac 21.0.12`.

```text
$ javac -version
javac 21.0.12
$ java -version
openjdk version "21.0.12" 2026-07-21
```

## Getting the code

Every example in this post lives in the repository
[java-cae](https://github.com/vajradevam/java-cae). Clone it and run the commands side
by side with the source files.

```text
$ git clone https://github.com/vajradevam/java-cae.git
$ cd java-cae
```

The repository has one directory per section. `flat/` contains the first example.
`proj/` contains the packaged project used in Parts 2 through 8. `access/` contains the
deliberately broken variant of Part 4. `oneway/` contains the default-package examples
of Part 9. Commands are run from inside the directory each section names, and the
output shown is exactly what those directories produce.

## Part 1. A simple program without packages

Before packages enter the picture, the two commands look trivial. The `flat/` directory
contains two files in one folder.

```java
// App.java
class App {
    public static void main(String args[]) {
        Calculator calc = new Calculator();
        System.out.println(calc.add(2, 3));
    }
}
```

```java
// Calculator.java
class Calculator {
    public int add(int x, int y) { return x + y; }
    public int sub(int x, int y) { return x - y; }
    public int mul(int x, int y) { return x * y; }
    public int div(int x, int y) { return x / y; }
}
```

Compile both files and run the one that defines `main`.

```text
$ ls
App.java  Calculator.java
$ javac App.java
(exit 0)
$ java App
5
$ ls
App.class  App.java  Calculator.class  Calculator.java
```

Three details matter here. Each one changes in the next part.

1. `javac App.java` found `Calculator` without any flags. Both classes live in the same
   default (unnamed) package, so javac needed no lookup configuration.
2. Without `-d`, class files are written next to the sources. The final listing shows
   `App.class` and `Calculator.class` sitting beside the `.java` files. There is no
   build directory.
3. `java App` ran with the bare class name, because the class is not part of any
   package.

A source file without a package statement belongs to the unnamed package, also called
the default package. Everything above relies on that fact. Part 2 adds one package
declaration and all three conveniences stop working.

## Part 2. Packages and fully qualified names

A package is a named namespace for classes. It does two jobs.

- Logical grouping. A package groups related classes and lets two classes with the same
  simple name exist in one program. `functions.Calculator` and `finance.Calculator` are
  different types even though both classes are named `Calculator`.
- Physical layout. The package name must mirror the directory structure. A class
  declared in package `a.b.C` must live in directory `a/b/` relative to the source
  root, and after compilation it must sit in `a/b/C.class` relative to the classpath
  root.

Defining a package takes one statement at the top of the file.

```java
package functions;   // must be the very first statement in the file
```

Several rules apply.

- The `package` statement must be the first statement. Only comments and whitespace may
  precede it, and it applies to the whole file.
- One package per file. Two different package declarations cannot appear in a single
  compilation unit.
- Package names are conventionally written in lowercase and often use a reversed domain
  name, such as `com.example.calculator`.

The `proj/` directory follows these rules. The list below shows its source files
relative to the project root.

```text
./src/calculator/App.java
./src/functions/Calculator.java
```

`App.java` declares `package calculator;`. `Calculator.java` declares
`package functions;`.

The full name of a class is the package name followed by the simple name, separated by
a dot. `functions.Calculator` and `calculator.App` are the fully qualified names, and
both work anywhere in code without an import.

## Part 3. Imports

`import` statements sit after the `package` statement and before the class
declaration.

```java
package calculator;

import functions.Calculator;   // imports one class
// import functions.*;         // imports all classes in functions

public class App {
    // ...
}
```

An import is not needed in three cases.

- The class you use is in your own package. Same-package classes see each other
  directly.
- The class lives in `java.lang`, such as `String`, `System`, or `Math`. That package is
  always available.
- You write the fully qualified name inline. `functions.Calculator calc =
  new functions.Calculator()` works without any import statement.

One rule surprises most beginners. The default package cannot be imported by anyone. A
class in a named package cannot write `import App;`, because the default package has no
name to import. Part 9 shows what happens when a named package tries to use a
default-package class.

## Part 4. Access modifiers

The classes in Part 1 were declared without a modifier.

```java
class Calculator { ... }
```

A class or member without a modifier is package-private, and that is the default.
Within one package this is sufficient. The moment classes live in different packages, it
ceases to be sufficient.

The `access/` directory contains a variant of the same project in which `Calculator`
lost its `public` modifier. Everything else is identical.

```java
// access/src/functions/Calculator.java
package functions;

class Calculator {               // no public
    public int add(int x, int y) {
        return x + y;
    }
}
```

Compiling the entry class (`access/src/calculator/App.java`) gives the following
result.

```text
$ javac -d out -sourcepath src src/calculator/App.java
src/calculator/App.java:3: error: Calculator is not public in functions; cannot be accessed from outside package
import functions.Calculator;
                ^
src/calculator/App.java:7: error: Calculator is not public in functions; cannot be accessed from outside package
        Calculator calc = new Calculator();
        ^
src/calculator/App.java:7: error: Calculator is not public in functions; cannot be accessed from outside package
        Calculator calc = new Calculator();
                              ^
3 errors
(exit 1)
```

The file does not compile because `Calculator` is package-private in `functions` and
`App` lives in `calculator`. An `import` does not override access control. Visibility is
enforced before anything can be linked.

The same rule applies to members. A public class whose `add` method were private would
produce an analogous error at the call site. If a class is meant to be used from another
package, the class must be `public`, and so must every method the caller invokes.

The full visibility ladder is shown below.

| Modifier | Same class | Same package | Subclass in another package | Anywhere |
|---|---|---|---|---|
| `public` | yes | yes | yes | yes |
| `protected` | yes | yes | yes | no |
| none (package-private) | yes | yes | no | no |
| `private` | yes | no | no | no |

`private` is the most restrictive level. It is visible only inside the enclosing class.

## Part 5. Compiling one file is not enough

In Part 1 the commands ran from inside the `flat/` directory. Real projects keep
sources below a root directory, as `proj/` does. The naive attempt compiles the entry
file the way Part 1 did.

```text
$ javac src/calculator/App.java
src/calculator/App.java:3: error: package functions does not exist
import functions.Calculator;
                ^
src/calculator/App.java:9: error: cannot find symbol
        Calculator calc = new Calculator();
        ^
  symbol:   class Calculator
  location: class App
src/calculator/App.java:9: error: cannot find symbol
        Calculator calc = new Calculator();
                              ^
  symbol:   class Calculator
  location: class App
3 errors
(exit 1)
```

`package functions does not exist`, and yet the directory `src/functions/` exists, and
the file exists. What happened?

Without `-sourcepath`, javac uses the classpath as its source search path, and the
classpath defaults to the current directory. The command above runs from `proj/`. When
javac resolves `import functions.Calculator` it looks for `functions/Calculator.java`
relative to `.`, which resolves to `proj/functions/Calculator.java`. No such file
exists, because the sources live under `src/`. javac does not guess where the source
tree root is.

The error is reported in stages. The `import` triggers a search for the package, which
fails, so the compiler prints `package functions does not exist`. Every later reference
to the class inside that package fails as well, once per use site. Two references to
`Calculator` therefore produce two `cannot find symbol` errors. All three messages have
one cause.

## Part 6. The compile command in detail

The command that works makes two things explicit. One option says where dependencies
live. One positional argument says which file to compile. The two occurrences of `src`
in the command are unrelated parts of the command line.

```text
javac   -d out   -sourcepath src   src/calculator/App.java
       option   option + value    positional argument
```

- `-sourcepath src` sets the source search root. When javac meets an import it is not
  already compiling, it appends the package path to this root and looks for the source
  there. `src` plus `/functions/Calculator.java` resolves to
  `src/functions/Calculator.java`. The file is found, loaded, and compiled as part of
  the same invocation. This is implicit compilation. The dependency was never named on
  the command line and it still gets compiled.
- `src/calculator/App.java` is a positional argument. It names the entry file. The
  `-sourcepath` option compiles nothing by itself, so a source file must always be
  named explicitly.

  ```text
  $ javac -d out -sourcepath src
  error: no source files
  (exit 2)
  ```

- `-d out` selects the output directory. javac creates the package directories under
  `out/` automatically from the `package` declarations.

  ```text
  $ javac -d out -sourcepath src src/calculator/App.java
  (silent success)
  $ find out -type f
  out/calculator/App.class
  out/functions/Calculator.class
  ```

An alternative exists that avoids `-sourcepath` entirely. Name every file on the command
line.

```text
$ javac -d out src/calculator/App.java src/functions/Calculator.java
```

Like the previous command, this is silent on success. The `-sourcepath` form exists so
the file list does not have to be maintained by hand. Projects grow, and the list
eventually becomes `$(find src -name '*.java')`.

## Part 7. Inside javac

The `-verbose` flag makes the compiler narrate its phases. The listing below keeps the
lines that concern this project and omits the JDK module files that javac also loads.
The absolute path in the first line reflects the local copy of the repository and will
differ on another machine.

```text
$ javac -verbose -d outv -sourcepath src src/calculator/App.java
[parsing started SimpleFileObject[/home/apathak/mycc/java/java-cae/proj/src/calculator/App.java]]
[parsing completed 9ms]
[search path for source files: src]
[loading src/functions/Calculator.java]
[parsing started DirectoryFileObject[src:functions/Calculator.java]]
[parsing completed 1ms]
[checking calculator.App]
[wrote outv/calculator/App.class]
[checking functions.Calculator]
[wrote outv/functions/Calculator.class]
[total 127ms]
```

The pipeline has five phases.

1. Parse. javac reads source and builds an abstract syntax tree. Syntax errors appear
   here.
2. Resolve. javac meets `import functions.Calculator` and searches for the type. It
   checks the compilation units already in progress, then the sourcepath for a `.java`
   file, then the classpath for a `.class` file. The `cannot find symbol` and
   `package does not exist` messages come from this phase.
3. Attribute and type-check. The compiler verifies that every expression is legal. Does
   `add(int, int)` exist on `Calculator`? Do the argument types match? Does each name
   resolve to exactly one declaration? Access rules are enforced here. Most compile
   errors are reported in this phase.
4. Flow analysis. The compiler checks definite assignment, unreachable code, and
   methods that fail to return on every path.
5. Write bytecode. Generics are erased, inner classes become files named
   `Outer$Inner.class`, and the `.class` files are written.

The order in the log matters. `App.java` is parsed first. `Calculator.java` is then
loaded, and both files are type-checked together. The unit of compilation is not one
file. It is the closure of dependencies that javac assembles, possibly across packages.

The `.class` files do not contain native machine code. The `javap` tool prints bytecode
in a readable form.

```text
$ javap -c -p out/functions/Calculator.class
Compiled from "Calculator.java"
public class functions.Calculator {
  public functions.Calculator();
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: return

  public int add(int, int);
    Code:
       0: iload_1
       1: iload_2
       2: iadd
       3: ireturn
[output elided]
```

The bytecode for `add` is a stack-machine sequence. It pushes the two arguments, applies
`iadd`, and returns the result. The class file refers to other types by name only, with
constant-pool entries such as `functions/Calculator` and `add`. The JVM resolves those
names at runtime using the classpath. That is why runtime lookup follows different rules
than compile-time lookup, and why Part 8 spends so much time on names.

## Part 8. Running the program

Compilation produces the class files. A separate tool runs them.

```text
$ java -cp out calculator.App
5
```

The command has two requirements.

1. The classpath, set with `-cp out`, must point at the package root. The launcher
   resolves `calculator.App` by appending the package path to the classpath, which
   produces `out/calculator/App.class`. The classpath must never point at a package
   directory itself.
2. The class name must be fully qualified, `calculator.App`. The simple name `App` is
   not acceptable.

Two failures illustrate the rules. The first command omits the package part of the name.

```text
$ java -cp out App
Error: Could not find or load main class App
Caused by: java.lang.ClassNotFoundException: App
(exit 1)
```

There is no `out/App.class`. Only `out/calculator/App.class` exists, so the JVM cannot
create the class that the name implies.

The second failure comes from changing into the package directory before running.

```text
$ cd out/calculator && java App
Error: Could not find or load main class App
Caused by: java.lang.NoClassDefFoundError: App (wrong name: calculator/App)
(exit 1)
```

The JVM finds the file this time. `out/calculator/App.class` exists on the classpath.
But the class inside the file declares itself `calculator.App`, which does not match the
name `App` that was requested. The verifier rejects the mismatch. The current directory
plays no part in class resolution. Only the classpath and the fully qualified name
matter.

## Part 9. A program in the default package

This section covers a layout that looks like a shortcut. The entry class sits directly
under the source root, without a package statement, while its dependency stays
packaged. The `oneway/` directory has that shape.

```text
./src/App.java                 // no package statement
./src/functions/Calculator.java
./src/functions/UseApp.java
```

`App.java` is a member of the default package. It imports a class from a named package.

```java
// oneway/src/App.java
import functions.Calculator;

public class App {
    public static void main(String args[]) {
        Calculator calc = new Calculator();
        System.out.println(calc.add(2, 3));
    }
}
```

Compile and run with the same commands as before, using `App` as the entry file.

```text
$ javac -d out -sourcepath src src/App.java
$ java -cp out App
5
```

The layout works. A class in the default package may import from a named package, and
the program runs using the simple name `App`. This is the structure that appears when a
packaged `Calculator.java` is combined with an `App.java` that has no `package`
statement. Note that compiling the entry file does not pull in `UseApp.java`; nothing
referenced reaches it, and javac only compiles the closure of what the entry file
depends on.

The restriction is one-directional. A class in a named package cannot see the default
package, because the default package has no name and therefore cannot be imported or
referred to. The third file in the directory demonstrates the failure. `UseApp` lives
in `functions` and returns an `App`.

```java
// oneway/src/functions/UseApp.java
package functions;

public class UseApp {
    public App make() {
        return new App();
    }
}
```

Compiling `UseApp` fails.

```text
$ javac -d out -sourcepath src src/functions/UseApp.java
src/functions/UseApp.java:4: error: cannot find symbol
    public App make() {
           ^
  symbol:   class App
  location: class UseApp
src/functions/UseApp.java:5: error: cannot find symbol
        return new App();
                   ^
  symbol:   class App
  location: class UseApp
2 errors
(exit 1)
```

The default package is a one-way street.

```text
default package  ->  named package   works
named package    ->  default package  fails
```

The layout in this section works today because nothing in `functions` needs `App`. The
moment any packaged class references the default-package class, the build breaks. Java 9
modules impose the same restriction, since a module cannot export an unnamed package.
The default package is a scratch space for short examples, not a place to keep
application code.

## Why this matters

The compilation and launch steps above run inside every tool that builds Java programs.

- IDEs configure `-sourcepath` and the classpath from the project model and then run
  the same tools invisibly. When an IDE reports an error it is the raw output of this
  pipeline. `package does not exist` and `ClassNotFoundException` are compiler and
  launcher messages, not IDE messages.
- Maven and Gradle encode the same choices as convention. `src/main/java` is the source
  root, `target/classes` is the output directory, and dependency jars are added to the
  classpath. A build error that says `package X does not exist` means exactly what it
  meant in Part 5. The sources or jars of `X` are not on the configured lookup paths.
- Single-file launchers such as `java App.java` work only for self-contained files.
  Once a program spans packages, they need the explicit lookup configuration shown in
  Part 6.
- JAR deployment keeps the same model. A jar is a compressed classpath root. The
  manifest names the main class by its fully qualified name, and the runtime still
  resolves everything by name.

Two questions cover the whole workflow.

1. During compilation, where are the sources of the classes I depend on, and where do
   the outputs go? The answers are `-sourcepath` and `-classpath` for lookup and `-d`
   for output.
2. During execution, which class starts the program and where is the package root? The
   answers are the fully qualified name and `-cp`.

## Reference

```text
# structure (source root is src/)
src/calculator/App.java          ->  package calculator;
src/functions/Calculator.java    ->  package functions;

# compile. -sourcepath tells javac where to find sources of dependencies
javac -d out -sourcepath src src/calculator/App.java

# alternative. list every file, no -sourcepath
javac -d out src/calculator/App.java src/functions/Calculator.java

# run. classpath is the package root (out), never a subfolder.
# the class name is the fully qualified one
java -cp out calculator.App
```

| Situation | What you get | Cause |
|---|---|---|
| `javac src/calculator/App.java` without `-sourcepath` | `package functions does not exist` | source lookup defaulted to `.` and never saw `src/` |
| No `public` on a cross-package class | `Calculator is not public in functions; cannot be accessed from outside package` | default access is package-private |
| `java -cp out App` with a packaged main class | `ClassNotFoundException: App` | no `out/App.class`; the class is `calculator.App` |
| `cd out/calculator && java App` | `NoClassDefFoundError: App (wrong name: calculator/App)` | the internal name inside the file does not match the requested name |
| named package references the default package | `cannot find symbol ... class App` | the unnamed package cannot be imported |

Java separates translation from execution. `javac` translates whatever is reachable from
the sourcepath, type-checks the whole closure together, and writes bytecode into a
mirror of the package tree. `java` links by name, and given a classpath root and a fully
qualified class name it finds, verifies, and runs exactly the class that was named. The
IDE button, the build tool, and the launcher all reduce to this.