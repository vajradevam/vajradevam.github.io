---
title: "Compiling and Running the Linux Kernel"
date: 2026-08-27
tags: [linux, kernel, technical, build-guide]
description: "A complete practical guide to building, installing, and running a vanilla Linux kernel from kernel.org sources on Debian-based systems"
---

People are told that building your own kernel is a rite of passage, something you do once to
brag about. It is actually just a long, fussy afternoon. Get the source, argue with a few
hundred thousand configuration symbols, run the build, install the result, and by evening
your machine runs something that only exists because you made it. This guide takes you
through that afternoon, and it sticks around for what comes after.

You will do it once on a Debian 13 box, in the order it actually happens. Know your machine
first, gather the tools, fetch the vanilla source, pick a configuration, compile, install,
and boot. The later chapters cover the parts that most writeups quietly skip, like
out-of-tree modules, Secure Boot, cross-building for other machines, iterating as upstream
moves, a troubleshooting table, and the fine art of saving a boot gone wrong. A reference to
the kernel's configuration system, plus appendices with the exact command for every step,
rounds it out.

The operating principle is short. Keep it simple, keep it visible, and verify everything.
Nothing in this book asks you to trust the vibes. When you finish you will know why each step
exists, which means you can do it all over again next year, on any machine, with any kernel,
and without a guide.

## Introduction, scope and reading order

This document is a self-contained, end-to-end manual for building a Linux kernel from
pristine ("vanilla") [kernel.org](https://kernel.org) sources, installing it so your
distribution's bootloader can boot it, running it day to day, updating it, and doing all of
this across *different machines*. You build on one host for another, cross-build for foreign
architectures, and test safely.

### Guiding philosophy: KISS, Suckless, DIY

This guide is written from a deliberately old-school standpoint. Three philosophies shape
every choice made here, and understanding them up front explains the *why* behind many of
the instructions that follow.

**KISS — *Keep It Simple, Stupid.*** Prefer the least machinery that gets the job done. A
plain `make` `&& make modules_install` `&& update-grub` beats a 500-line build script;
generated files and compiled blobs stay out of your version control; you understand every
step you run. Where a simple manual method and a clever automation both work, this guide
defaults to the simple one and mentions the clever one only in passing.

**Suckless — *software that is worse is better*.** Small, explicit tools that each do one
thing well (in the original sense: bite-sized, transparent, and do-it-yourself) are easier
to audit, debug, and trust than one opaque monolith. You will meet single-purpose utilities
(`depmod`, `update-initramfs`, `grub-mkconfig`) rather than a facade that hides what it
does. The kernel's own `make` targets and `scripts/config` are used directly so you can see
the wires.

**DIY — *Do It Yourself.*** Build and install your own kernel rather than consuming a
black-box distro binary. This is the payoff: a kernel tuned to your hardware, your patches,
your choices. DIY means you accept responsibility for reading error messages and knowing
where files live; in return you gain real understanding and a system you can genuinely
maintain and repair.

Keep these three in mind and most of the guide reads naturally. Whenever a step seems
needlessly fiddly, it is usually because the underlying mechanism is being shown rather than
hidden.

It merges two traditions.

- the **traditional/manual method**. You control every artifact.
- the **Debian way**. The kernel produces `.deb` packages itself (`make bindeb-pkg`), so
  installation, initramfs and bootloader wiring are handled by `dpkg`.

This guide is written for x86_64 machines running Debian 13 (trixie) or compatible
derivatives (Ubuntu, Mint, Pop!_OS). Where commands or paths differ on other distributions,
a note is included. The kernel source used throughout is **7.2** (vanilla from kernel.org),
but the procedures apply to any recent mainline or stable release with minimal adaptation.

### How to read this document

Follow the sections in order for a first build. Sections [Build
prerequisites](#build-prerequisites) through [First boot and
validation](#first-boot-and-validation) form the mandatory pipeline below.

1. **prerequisites** — from [Build prerequisites](#build-prerequisites)
2. **obtain source** — from [Acquiring and preparing the source](#acquiring-and-preparing-the-source)
3. **configure** — from [Kernel configuration](#kernel-configuration)
4. **compile** — from [Compilation](#compilation)
5. **install** — from [Installation](#installation)
6. **bootloader** — from [Bootloader configuration](#bootloader-configuration)
7. **first boot & validation** — from [First boot and validation](#first-boot-and-validation)

Everything after that (packaging alternatives, cross-compilation, other machines,
troubleshooting, recovery) is reference material consulted on demand. Commands prefixed `$`
run as your normal user; commands prefixed `#` require root (`sudo`). Never build the kernel
*as root*; only the installation steps need privilege.

### Kernel release model, and which version to pick

- **mainline**. Linus's tree; an `-rcN` series precedes each merge-window release. New
  features land here first.
- **stable**. Each mainline release is maintained as `x.y.z`; bug/security fixes only.
  Roughly one release every 9–10 weeks becomes the next stable base.
- **longterm (LTS)**. Selected stables are maintained for years (e.g. 6.12 is an LTS and is
  commonly used as a distro kernel).
- **linux-next**. Integration tree; never for daily use.

Throughout this guide, replace *X.Y.Z* with your chosen kernel version (e.g. `7.2`,
`6.12.10`, etc.). After a default build the running system will report
`uname -r` ⇒ `X.Y.Z` (plus any `LOCALVERSION` suffix you set, [Naming your kernel (do this
FIRST)](#naming-your-kernel-do-this-first)).

#### Why 7.2, and what is in it

Linux 7.2 (released stable 2026-08-09) is a large mainline cycle. Highlights relevant to a
desktop/workstation builder include:

- **Btrfs** work: improved subvolume accounting, delayed bookkeeping and latency
  reductions, plus new `io_uring` integration.
- **Scheduler** changes that trim wake-up latency (the "EEVDF" per-core approach was
  refined across 6.12–7.x), helping responsiveness on multicore boxes like the Xeon E5-1607.
- **Networking**: performance/refcount cleanups in the core stack, better
  hardware-offload handling, and continued `io_uring` networking maturity.
- **Architecture** enablement across ARM (incl. new SoCs), RISC-V, and LoongArch, plus
  AMD/Intel platform updates.
- **Security/hardening** backports continuing the 6.x line's hardening (e.g. mitigations
  and lockdown).

None of this requires any special config decision from you. The point of mentioning it is
calibration: 7.2 is a current, actively maintained kernel; building it is not exotic. If a
feature you care about (a new driver, filesystem option) appears in the changelog, it
becomes available to you simply by choosing these sources.

### What a build actually produces

| Artifact | Purpose |
|---|---|
| `arch/x86/boot/bzImage` | The compressed bootable kernel image ("vmlinuz"). Contains the decompressor plus the kernel proper. Note the **x86** (not x86_64): the kernel merges the 32-bit and 64-bit variants into one `arch/x86/` tree — `x86_64` vs `i386` is chosen by config (`CONFIG_64BIT=y`), not by a separate directory. Truly different architectures get their own dirs (`arch/arm64/boot/Image.gz`, `arch/loongarch/boot/`, ...). |
| `*.o / built-in.a` | Intermediate objects; stay in the tree, not installed. |
| `*.ko` | Loadable modules, thousands of them; installed under `/lib/modules/<release>/`. |
| `System.map` | Symbol table (name → address). Needed for legible oops traces; not required to boot. |
| `.config` | The exact configuration used. Back it up; it defines reproducibility. |
| `Module.symvers` | CRCs of exported symbols; required to build *external* modules (e.g. NVIDIA, VirtualBox) against this kernel. |
| initramfs (initrd) | Early-userspace archive containing storage/filesystem drivers and userspace helpers, unpacked by the kernel before mounting the real root. Generated *after* the build, per distro ([Method A, traditional manual install](#method-a-traditional-manual-install), step 3). |

### vermagic, and why module/kernel pairing matters

Every module records a *vermagic* string, e.g. `7.2.0-custom SMP preempt mod_unload`. The
loader refuses modules whose vermagic does not exactly match the running kernel's release,
or whose symbol CRCs (`CONFIG_MODVERSIONS`) differ. The consequences are that after booting
a new kernel you can only load modules built *for that kernel*; DKMS exists to rebuild
third-party modules automatically ([Third-party (out-of-tree) modules and
DKMS](#third-party-out-of-tree-modules-and-dkms)); and you must always keep a known-good
distro kernel installed as a fallback.

## Know your machine

Before configuring the kernel, you need to know what hardware you have. Gather this
information on your target machine *before* you begin.

```text
$ uname -m                        # architecture (x86_64, aarch64, ...)
$ lscpu | head -20                # CPU model, cores, threads
$ lsblk                           # disks and partitions
$ lspci | grep -iE 'net|vga'     # network and graphics controllers
$ lsusb                           # USB devices
$ cat /sys/firmware/efi/fw_platform_size 2>/dev/null && echo "UEFI" || echo "BIOS"
$ df -h /                         # root disk free space
```

Fill in the template below for your machine. This drives configuration decisions throughout
the guide, especially the critical symbols in [Machine-critical symbols
(checklist)](#machine-critical-symbols-checklist).

| Property | Your value |
|---|---|
| Architecture | (e.g. x86_64, aarch64) |
| CPU | (model, cores/threads) |
| RAM | (total) |
| Disk | (size, filesystem type, mount point) |
| Firmware | (UEFI or legacy BIOS; Secure Boot on or off) |
| NIC | (model → look up the driver in `drivers/net/ethernet/`) |
| GPU | (model → look up driver with `lspci -k`) |
| Root filesystem | (ext4, btrfs, xfs, ...) |
| Bootloader | (GRUB 2, systemd-boot, ...) |
| Distro | (e.g. Debian 13 trixie, Ubuntu 25.04, Fedora 42) |

**Worked example.** The original version of this guide was developed on an HP Z420
workstation (Intel Xeon E5-1607, 4 C/4 T, 32 GiB RAM, dual NVIDIA Quadro K2000, Intel
82579LM NIC, AHCI SATA, UEFI with Secure Boot off, Debian 13 trixie, ext4 root on
`/dev/sda2`). That machine's filled-in profile would look like this.

```text
Architecture: x86_64
CPU:          Intel Xeon E5-1607 0 @ 3.00 GHz (Sandy Bridge-E, 4C/4T)
RAM:          32 GiB
Disk:         433 GiB sda2 ext4, ~397 GiB free
Firmware:     UEFI, Secure Boot DISABLED
NIC:          Intel 82579LM -> e1000e driver
GPU:          2x NVIDIA Quadro K2000 (GK107) -> nouveau driver
Root FS:      ext4 on /dev/sda2
Bootloader:   GRUB 2
Distro:       Debian 13 "trixie"
```

The guide was also tested on an Ubuntu 24.04.3 LTS "noble" Dell OptiPlex 3070 (Intel
i7-9700T, 8 C/8 T, 32 GiB RAM, Intel UHD Graphics 630). Its profile shows a simpler,
single-vendor hardware set with no discrete GPU (so no `nouveau` path needed):

```text
Architecture: x86_64
CPU:          Intel i7-9700T @ 4.30 GHz (Coffee Lake, 8C/8T)
RAM:          32 GiB
Firmware:     UEFI
GPU:          Intel CoffeeLake-S GT2 (UHD Graphics 630) -> i915 driver
Root FS:      ext4
Bootloader:   GRUB 2
Distro:       Ubuntu 24.04.3 LTS "noble"
```

The key point is to identify your NIC driver, GPU driver, storage controller, and root
filesystem. These determine the symbols that *must* be enabled in your kernel config or the
machine will not boot.

## Build prerequisites

### Debian 13 (trixie) and derivatives

```text
# apt update
# apt install build-essential libncurses-dev flex bison libssl-dev \
      libelf-dev bc dwarves rsync xz-utils zstd cpio kmod pciutils \
      fakeroot dpkg-dev git
```

Role of each piece.

- `build-essential`. Gcc, binutils, make, libc headers.
- `libncurses-dev`. `menuconfig`/`nconfig` UIs.
- `flex`/`bison`. Kconfig parser generation.
- `libssl-dev`. Module signing, extract-cert.
- `libelf-dev`. Objtool, ORC unwinder, BPF machinery.
- `dwarves` (provides `pahole`). Required whenever `CONFIG_DEBUG_INFO_BTF` is on, and distro
  configs usually turn it on. Missing pahole is the #1 "why won't Debian's config build?"
  failure.
- `fakeroot`/`dpkg-dev`. `bindeb-pkg` packaging.
- `zstd`, `xz-utils`, `cpio`. Compression formats and initramfs assembly.

Optional but useful packages are `ccache` (compile cache, [ccache](#ccache)), `clang`/`lld`
(LLVM builds, [LLVM/Clang builds](#llvmclang-builds)), `dracut` (alternative initramfs
generator), `kexec-tools` (fast reboot-testing, [kexec, rebooting into the new kernel
without firmware](#kexec-rebooting-into-the-new-kernel-without-firmware)),
`qemu-system-x86` (safe test boots, [QEMU direct kernel boot
(safest)](#qemu-direct-kernel-boot-safest)).

**Other distributions.** **Fedora/RHEL** use these packages.

```text
dnf groupinstall "Development Tools" && dnf install ncurses-devel \
  openssl-devel elfutils-libelf-devel bison flex bc dwarves kmod-tools \
  rpm-build
```

**Ubuntu** is identical to Debian, so the same `apt` packages work.

### Toolchain requirements and versions

The top-level `Documentation/process/changes.rst` in your tree lists minimum versions
(gcc, make, binutils, perl, openssl, pahole, ...). Debian trixie's toolchain satisfies them
comfortably for 7.x. Two checks worth doing once.

```text
$ gcc --version && ld --version | head -1 && pahole --version
```

(In practice kbuild itself verifies toolchain minimums during configuration and aborts
early with a clear message if something is too old.)

## Acquiring and preparing the source

There are three ways to obtain a kernel source tree. Each is self-contained. Follow
whichever suits your situation.

### Route A, Download a tarball (simplest)

This is the most straightforward path. You download a compressed archive from kernel.org
and extract it.

#### Step 1, Download

```text
$ cd ~
$ mkdir -p kernelbuild && cd kernelbuild
$ wget https://cdn.kernel.org/pub/linux/kernel/v7.x/linux-7.2.tar.xz
```

If you want to verify the signature (recommended), fetch the .sign file.

```text
$ wget https://cdn.kernel.org/pub/linux/kernel/v7.x/linux-7.2.tar.sign
```

#### Step 2, Verify the signature (optional but recommended)

The signature covers the uncompressed `.tar`, so decompress without untarring first.

```text
$ unxz -k linux-7.2.tar.xz
$ gpg --list-packets linux-7.2.tar.sign | grep -i keyid | awk '{print $NF}' \
    | xargs gpg --recv-keys
$ gpg --verify linux-7.2.tar.sign linux-7.2.tar
```

Proceed only on "Good signature".

#### Step 3, Extract

```text
$ tar -xf linux-7.2.tar
$ ls linux-7.2/           # you should see Makefile, Kconfig, arch/, drivers/, ...
```

#### Step 4, Clean the tree

Tarballs can contain stale metadata. Before first use, sanitize.

```text
$ cd linux-7.2
$ make mrproper
```

This removes *all* generated files including any `.config`. It is the equivalent of
returning the tree to a pristine state. The `mrproper` target implies `clean`; running both
is redundant.

### Route B, Clone via git (best for iterating)

If you plan to update the tree, bisect regressions, or carry local patches, a git clone is
the better long-term investment.

#### Step 1, Clone

```text
$ cd ~
$ git clone --depth 1 \
    https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git
$ cd linux
```

The `--depth 1` flag fetches only the latest commit (about 1.5 GiB instead of 10+). If you
later need full history for bisecting, run `git fetch --unshallow`.

#### Step 2, Check out the version you want

```text
$ git fetch --tags          # shallow clone only has HEAD; fetch older tags
$ git checkout v7.2.0
```

#### Step 3, Clean

```text
$ make mrproper
```

On a git tree the release name is affected by `CONFIG_LOCALVERSION_AUTO`; see [Naming your
kernel (do this FIRST)](#naming-your-kernel-do-this-first) for how to tame it.

### Route C, Debian source package (distro-patched kernel)

If you prefer Debian's own patched and configured kernel instead of vanilla, do the
following.

```text
# apt install linux-source-6.12
$ cd /usr/src
$ tar -xf linux-source-6.12.tar.xz
$ cd linux-source-6.12
```

That tree already contains Debian's config and patches. That is convenient, but it is not
the vanilla experience this guide primarily documents.

### Which route to choose?

| Route | Best for | Trade-off |
|---|---|---|
| Tarball | First build, simplicity, archival | No history; re-download for each version |
| Git | Iterating, bisecting, carrying patches | Larger clone; need to `checkout` tags |
| Debian | Matching the distro kernel exactly | Not vanilla; patches may obscure upstream behavior |

In all three cases, the tree ends up in the same state after `mrproper` leaves a clean
source directory ready for configuration.

## Kernel configuration

Configuration is stored in `.config` at the tree root; every symbol is either `y`
(built-in), `m` (module) or absent/disabled. Getting a sane baseline right is 80% of the
battle. The recommended path is to start from the running distro kernel's proven config,
prune or adjust, and resolve drift with `olddefconfig`.

### Starting points, ranked

1. **Running Debian kernel's config** (recommended for most users).

```text
$ ls /boot/config-$(uname -r)         # exists on Debian
$ cp /boot/config-$(uname -r) .config
```

Debian usually ships `/proc/config.gz` if the running kernel was built with
`CONFIG_IKCONFIG_PROC=y`. Check first with
`test -f /proc/config.gz && zcat /proc/config.gz > .config`. If it does not exist, the
`/boot/config-*` copy above is the reliable fallback.

2. **Architecture default**. `make defconfig`. Minimal-ish x86_64 default from the kernel
   maintainers; boots typical hardware, but lacks many distro niceties (and on non-x86
   arches picks the arch's own default, [Scenario 2,
   cross-compilation](#scenario-2-cross-compilation)).

3. **Tiny/minimal**. `make tinyconfig` then add what you need. Educational, painful for
   desktops.

4. **From scratch interactive**. `make menuconfig` on an empty tree starts from sensible
   Kconfig defaults. This is expert mode.

### Resolving version drift, oldconfig vs olddefconfig

A config from one kernel version copied into a newer tree contains symbols that were
renamed, removed, or added. At build time kbuild would interrogate you for each new symbol.
Avoid that.

```text
$ make olddefconfig    # apply defaults for NEW symbols, keep known ones, silent
$ make oldconfig       # same, but INTERACTIVELY asks for each new symbol
```

Always run `olddefconfig` immediately after importing a config, then diff the result
against your starting point to see what changed.

```text
$ cp .config /tmp/config.before
$ make olddefconfig
$ diff /tmp/config.before .config | less
```

### Trimming to your hardware with localmodconfig

`make LSMOD=$(mktemp) localmodconfig` disables every module not currently loaded on the
machine (reading `lsmod`), dramatically cutting build time and size. A caveat is that
anything not loaded *at that moment* (e.g. a rarely-used USB dongle driver, loop, most
netfilter extras) disappears; run it only on configs for *this specific machine*, never
for images destined for other hardware. Keep the full distro config as fallback;
re-enable with `menuconfig` if a device stops working.

To force a decision non-interactively, `scripts/config` is your API.

```text
$ ./scripts/config --file .config --enable EXT4_FS       # =y
$ ./scripts/config --module DRM_NOUVEAU                  # =m
$ ./scripts/config --disable DEBUG_INFO                  # =n
$ ./scripts/config --set-str LOCALVERSION "-mykernel"
$ make olddefconfig                                      # reconcile afterwards
```

### Interactive frontends

- `make menuconfig`. Classic ncurses; search with `/` (shows prompt, symbol name,
  depends/requires. Indispensable).
- `make nconfig`. Nicer ncurses with split help pane.
- `make xconfig` (Qt) / `make gconfig` (GTK). GUIs.
- `make merge_config.sh fragment.config`. Apply partial overrides onto a base config;
  ideal for scripted variants.
- `make savedefconfig && cp defconfig my-min.cfg`. Emit the *minimal* delta from
  defaults; the format used for in-tree arch configs and great for version-controlling
  your tweaks.

### Naming your kernel (do this FIRST)

Set a distinctive local version so your kernel can never collide with, or be mistaken
for, a distro kernel. You have two ways to do this.

#### Method 1, Interactive (menuconfig)

```text
$ make menuconfig
```

Navigate to the following.

```text
General setup  --->
    (-mykernel) Local version - append to kernel release
    [ ] Automatically append version information (CONFIG_LOCALVERSION_AUTO=n)
```

Type your local version (e.g. `-mykernel`) at the first prompt. For the second prompt,
press `Y` or `N` to toggle. Press `S` to save, then `Q` to quit.

#### Method 2, Non-interactive (scripts/config)

```text
$ ./scripts/config --set-str LOCALVERSION "-mykernel"
$ ./scripts/config --disable LOCALVERSION_AUTO
$ make olddefconfig
```

The `--set-str` sets the string value. The `--disable` unsets the auto-append flag.
Always run `olddefconfig` afterwards to reconcile dependencies.

**Tip.** On a **git tree** with `LOCALVERSION_AUTO=y`, the kernel appends a githash and
dirty flag to the release name, producing something like
`7.2.0-00042-g1a2b3c-dirty`. This is useful during active development. You can instantly
tell which commit you are running and whether you have uncommitted changes. For daily use
it is noisy and breaks module paths; set it to `n`.

Result. `uname -r` ⇒ `7.2.0-mykernel`; artifacts become `/lib/modules/7.2.0-mykernel/`,
`/boot/vmlinuz-7.2.0-mykernel`, etc. Distinct naming is what lets GRUB list both the
stock distro kernel and your kernel side by side, and what makes `dpkg` treat them as
independent packages.

### Debug info, the single biggest time/space lever

Full debug info multiplies build time and disk use several-fold (Debian estimates,
~2 GB vs ~15 GB packaged, and similar ratios in-tree). You only need it for
crash-dump/kgdb/BTF tooling.

```text
$ ./scripts/config --disable DEBUG_INFO          # kills DEBUG_INFO_DWARF*
$ ./scripts/config --disable DEBUG_INFO_BTF      # also drops pahole dependency
$ ./scripts/config --disable GDB_SCRIPTS
$ make olddefconfig
```

Keep `DEBUG_INFO` on only if you will use perf with annotated source, BPF tracing with
CO-RE, or `crash`. Note disabling BTF breaks some systemd/BPF-based tooling; that is
acceptable for experimentation.

### Machine-critical symbols (checklist)

If you prune aggressively, these must survive. Verify with `grep -E 'SYM=' .config`.

```text
CONFIG_64BIT=y                          # (x86_64 only) 64-bit kernel
CONFIG_EFI=y                            # UEFI boot path
CONFIG_EFI_STUB=y                       # kernel as its own EFI executable
CONFIG_BLK_DEV_INITRD=y                 # initramfs support
CONFIG_DEVTMPFS=y                       # dynamic /dev; systemd REQUIRES this
CONFIG_DEVTMPFS_MOUNT=y                 # auto-mount /dev at boot
CONFIG_CGROUPS=y                        # process groups; systemd REQUIRES this
CONFIG_AHCI=y                           # AHCI SATA controller (built-in = safest)
CONFIG_BLK_DEV_SD=y                     # SCSI disk layer
CONFIG_EXT4_FS=y                        # ext4 root filesystem
CONFIG_EFI_PARTITION=y                  # GPT partition table support
CONFIG_UNIX=y                           # Unix domain sockets
CONFIG_TMPFS=y                          # tmpfs (needed by systemd, /run, etc.)
CONFIG_PROC_FS=y                        # /proc filesystem
CONFIG_SYSFS=y                          # /sys filesystem
CONFIG_IA32_EMULATION=y                 # 32-bit program support (wine, steam)
```

**Warning.** **Importing a distro config into vanilla source.** Debian's config points
`CONFIG_SYSTEM_TRUSTED_KEYS` and `CONFIG_SYSTEM_REVOCATION_KEYS` at Debian-only
certificate files that do not exist in a vanilla tree. The build fails late with
confusing certificate errors. Fix immediately after copying the config.

```text
$ ./scripts/config --set-str SYSTEM_TRUSTED_KEYS ""
$ ./scripts/config --set-str SYSTEM_REVOCATION_KEYS ""
```

Similarly, if you keep module signing on, point `CONFIG_MODULE_SIG_KEY` at a fresh
auto-generated key (`certs/signing_key.pem`) or disable `MODULE_SIG` outright while
Secure Boot is off.

### CPU-specific tuning (optional)

Under *Processor type and features*, family "Core 2/newer Xeon" (`GENERIC_CPU`) is the
safe generic build; `X86_NATIVE` style options or `-march=native` via
`arch/x86/Makefile` cc-options squeeze a little performance but make the image
non-portable to older hosts. Enable `X86_INTEL_PSTATE` for modern Intel CPUs and
`X86_MCE`/`X86_MCE_INTEL` for hardware error reporting. Leave preemption at
`PREEMPT_DYNAMIC` (distro default) is runtime-selectable between server and desktop
latencies via `preempt=` cmdline.

### Backing up

Copy `.config` somewhere outside the tree after every successful experiment, because
`mrproper` deletes it without mercy.

```text
$ cp .config ~/kernel-configs/7.2.0-mykernel-v1.cfg
```

### The .config, a complete reference

The kernel contains thousands of configuration symbols. Understanding what each one does
is essential for building a working, optimized kernel. The following section provides a
comprehensive, symbol-by-symbol reference organized by the `make menuconfig` menu
hierarchy.

To follow along, open `make menuconfig` in your source tree and navigate the menus. Each
subsection below corresponds to a top-level menu entry. For each option you will find the
following.

- **Symbol name**. The `CONFIG_*` variable in `.config`
- **Menuconfig prompt**. The human-readable label you see in the menu
- **Type**. Bool (`y`/`n`), tristate (`y`/`m`/`n`), int, or string
- **Dependencies**. Other symbols that must be enabled
- **Default**. What the kernel picks if you do not intervene
- **Explanation**. What the option controls and when to use it

You can also look up any symbol interactively.

```text
$ grep -r "config FOO" init/ drivers/ lib/ net/  # find where FOO is defined
$ make menuconfig                                  # then press '/' and type FOO
```

The deep-dive reference begins in Section [The .config, a complete
reference](#the-config-a-complete-reference).

## Compilation

### Basic invocation

```text
$ cd ~/Code/linux-7.2
$ make -j$(nproc)
```

The `-j` flag sets parallelism. A good rule of thumb is `cores + 2` (e.g. `-j6` on a
4-core machine with hyperthreading). First full build should take roughly 25–50 minutes
on a typical desktop with a debug-disabled config; hours with debug info on. Progress
lines print each compiled file. Subsequent builds after touching a handful of files take
seconds. Kbuild tracks dependencies precisely.

Useful parallelism knobs are `-jN` jobs, `make -jN O=out`
([Out-of-tree object directory](#out-of-tree-object-directory)), and the environment
`KBUILD_BUILD_JOBS`. If the machine feels unusable during builds, lower `-j`; the linker
and per-directory sync phases are the memory spikes.

**Tip.** `-jN` sets how many compilations run in parallel. A safe starting point is half
your CPU count; raise it while the machine stays responsive. Monitor with `htop` during
the first build.

**If -j is too small** nothing breaks; the build just crawls. the CPUs sit idle while
one file compiles at a time (`make` without `-j` runs a single job).

**If -j is too large** each concurrent `gcc` can hold several hundred MB to over 1 GB of
RAM. Oversubscribe and the OOM killer declares `Killed` (build fails with error 137) or
the system thrashes in swap. The kernel build is usually *memory*-bound, not CPU-bound,
so limit `-j` by RAM first. A rough "2 GB per job" rule errors on the safe side. The
final single-threaded `ld` link is a common OOM point.

**Formulas people use** are shell expansions of `nproc`.

- `-j$(nproc)`. Equal to core count; the plain default.
- `-j$((nproc+1))`. "cores + 1". The extra job tends to sit I/O-bound waiting on disk,
  so it fills otherwise-idle CPU time. This is a widely copied best practice for small
  builds.
- `-j$((nproc-1))`. Leave one core free so the desktop stays usable (debated whether
  this is actually optimal, but harmless).
- `-j$((nproc*3/2))`. "1.5 x cores". Some guides overshoot because jobs finish early
  and the scheduler can't perfectly pack cores. This is fine on RAM-rich machines, risky
  on 4–8 GB laptops.

**The `-j100` flag** is a joke or curiosity, not advice. Compiling cannot run 100x in
parallel on an 8-core box. A huge value mostly adds scheduler overhead and guarantees
RAM exhaustion; it does not build faster. Mountains of user reports exist of
`make -j$(nproc*100)` trashing swap or dying with `Killed`. If you see a guide
suggesting `-j100`, it's trolling. Stick to cores-or-slightly-below, and let RAM set the
ceiling.

### Out-of-tree object directory

Keeping generated files away from the pristine source allows several parallel
configurations of the same tree and trivially clean diffs.

```text
$ make O=~/kbuild-out menuconfig     # .config lands in O=
$ make O=~/kbuild-out -j$(nproc)
$ sudo make O=~/kbuild-out modules_install
```

Remember to pass `O=` to *every* subsequent make, including installation and
external-module builds. Mixing in-tree and `O=` builds in the same tree causes confusing
failures. Commit to one style.

### LLVM/Clang builds

The kernel builds fully with Clang and links with LLD.

```text
$ make LLVM=1 -j$(nproc)                    # clang, lld, llvm-ar, ...
```

Requires `clang`, `lld`, `llvm` packages (on Debian, run `apt install clang lld llvm`).
LTO variants (`CONFIG_LTO_CLANG_THIN`) exist for the adventurous; slower builds,
occasionally better runtime. GCC remains the reference compiler. Use whichever, but do
not mix compilers in one build directory without `mrproper`.

### ccache

After any `make clean`, ccache turns a full rebuild into a fraction of the time, because
identical inputs hit the cache.

```text
$ make CC="ccache gcc" -j$(nproc)
```

Cache grows large (>5 GiB); configure `ccache -M 10G`. Do not combine ccache statistics
expectations with `-Werror` experiments.

### Reading the output

Warnings are normal (especially with newer compilers); they are not fatal. Errors stop
the build with the failing file/command visible. Rerun the exact failing `gcc` line
manually for detail, or add `V=1` to make for verbose commands. If you want
warnings-as-errors, use `make W=n` (extra checks) or `CONFIG_WERROR` (upstream CI
posture; expect noise on fresh versions).

### Where results land

```text
arch/x86/boot/bzImage      -> the kernel
System.map                 -> symbol table
.config                    -> frozen configuration
drivers/**/*.ko, .../*.ko  -> modules (thousands)
```

On ARM and others the image name differs (`Image.gz`, `Image.gz-dtb`);
[Scenario 2, cross-compilation](#scenario-2-cross-compilation).

## Installation

Three routes. Pick *one per installed kernel* and stay consistent. Route B (Debian
packages) is strongly recommended, since it wires initramfs + GRUB automatically,
upgrades/uninstalls cleanly through `dpkg`, and survives your memory lapses. Route A
teaches you what Route B automates.

### Method A, traditional manual install

#### 1. Modules

```text
$ sudo make modules_install
```

Installs to `/lib/modules/7.2.0-mykernel/` (on modern merged-/usr distros `/lib` is a
symlink to `/usr/lib`; identical location). Runs `depmod` automatically, generating
`modules.dep` et al. which `modprobe` consults. Size is 1–5 GiB depending on pruning.
Staging alternative for deployment elsewhere is
`make INSTALL_MOD_PATH=/tmp/stage modules_install`
([Scenario 1, build here, run there (same arch)](#scenario-1-build-here-run-there-same-arch)).

#### 2. Kernel image and friends to /boot

Avoid bare `sudo make install` on Debian, because it delegates to distro-specific
`installkernel` hooks whose behavior varies. Explicit copies are predictable.

```text
$ sudo cp arch/x86/boot/bzImage  /boot/vmlinuz-7.2.0-mykernel
$ sudo cp System.map             /boot/System.map-7.2.0-mykernel
$ sudo cp .config                /boot/config-7.2.0-mykernel
```

#### 3. initramfs

**Warning.** **Do step 1 first.** `update-initramfs` builds the initramfs from the
modules in `/lib/modules/<version>/` — if you run it before `sudo make modules_install`,
you get the failures above: "missing /lib/modules/<version>", "depmod: FATAL: could not
search modules", and an initramfs without your drivers. The install order is
*non-negotiable*: **modules → kernel files → initramfs → bootloader**.

Debian (initramfs-tools) uses these commands.

```text
$ sudo update-initramfs -c -k 7.2.0-mykernel      # create
$ sudo update-initramfs -u -k 7.2.0-mykernel      # regenerate after changes
```

It harvests modules from `/lib/modules/7.2.0-mykernel/` and packs storage/fs drivers
per `/etc/initramfs-tools` and names the result
`/boot/initrd.img-7.2.0-mykernel`. The dracut equivalent is
`dracut --kver 7.2.0-mykernel --force`.

Because your root FS is plain ext4 on AHCI, a correctly configured kernel with
`EXT4_FS=y` and `AHCI=y` can boot even *without* an initramfs (GRUB passes
`root=/dev/sda2` or `root=UUID=...`); the initramfs mainly buys
LVM/encryption/early-microcode flexibility. Keep generating one anyway. It costs nothing
and matches distro behavior.

#### 4. Bootloader entry

GRUB's `10_linux` script auto-discovers every `/boot/vmlinuz-*` and generates matching
menu entries on `update-grub`.

```text
$ sudo update-grub            # wrapper for grub-mkconfig -o /boot/grub/grub.cfg
```

Verify your kernel appears in `/boot/grub/grub.cfg` (`grep menuentry`). Nothing else to
do on this setup. (EFI-stub / systemd-boot users should see [EFISTUB / systemd-boot
alternative](#efistub--systemd-boot-alternative).)

### Method B, Debian packages with make bindeb-pkg

One command produces installable `.deb`s in the parent directory.

```text
$ cd ~/Code/linux-7.2
$ make bindeb-pkg -j$(nproc) KDEB_PKGVERSION=$(make kernelversion)-1
```

A few notes follow.

- `LOCALVERSION` must match whatever is baked into `.config` ([Naming your kernel (do
  this FIRST)](#naming-your-kernel-do-this-first)); safest to set it only in the config
  and omit it here.
- It typically produces `linux-image-7.2.0-mykernel_*.deb`,
  `linux-headers-7.2.0-mykernel_*.deb` (needed for DKMS/out-of-tree modules),
  `linux-libc-dev_*.deb`, optionally a `linux-image-*-dbg` pair if debug info survived
  in config.
- `deb-pkg` (without "bin") additionally builds *source* packages. Slower, rarely
  needed.

Install the packages with dpkg.

```text
$ sudo dpkg -i ../linux-image-7.2.0-mykernel_*.deb \
              ../linux-headers-7.2.0-mykernel_*.deb
```

The package postinst runs `depmod`, builds the initramfs (initramfs-tools hook), and
triggers `update-grub`. That is, it performs Method A steps 1–4 for you. Remove later
with `sudo apt purge linux-image-7.2.0-mykernel linux-headers-7.2.0-mykernel` (also
cleans `/lib/modules` and initramfs).

Rebuilding after edits reuses the tree incrementally; rerunning `bindeb-pkg` repackages
quickly. If you want the package version to rise on each iteration, bump
`KDEB_PKGVERSION`. Apt treats equal versions as no-upgrade.

### Secure Boot interlude

Today your firmware may have SB off, so all routes above just work. The moment you
enable Secure Boot, unsigned kernels are refused by firmware and unsigned modules
refused by the kernel. Plan ahead with [Secure Boot and signing (MOK
route)](#secure-boot-and-signing-mok-route) (self-signed MOK chain via
`sbsign`/sbctl). Retrofitting signing knowledge is much easier before you need it.

## Bootloader configuration

### GRUB 2 (most common)

After any manual (Method A) install, run `sudo update-grub`. Package (Method B) installs
trigger this automatically. Useful knobs live in `/etc/default/grub`.

```text
GRUB_DEFAULT=0                      # 0 = boot newest-discovered by default
GRUB_TIMEOUT=5
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"   # normal boots
GRUB_CMDLINE_LINUX=""               # appended to EVERY entry incl. recovery
```

Per-entry editing at boot works by pressing `e` on the highlighted entry, editing the
`linux` line, then `Ctrl-X` to boot. This is perfect for one-off tests
(`nouveau.modeset=0`, `init=/bin/bash`, `systemd.unit=rescue.target`, ...) without
touching files.

### EFISTUB / systemd-boot alternative

With `CONFIG_EFI_STUB=y` the kernel image is itself a valid EFI program; a bootloadless
setup copies `bzImage` + initramfs into the ESP and either registers a boot entry once
with efibootmgr.

```text
# efibootmgr --create --disk /dev/sda --part 1 --label "Linux 7.2 mykernel" \
    --loader '\vmlinuz-7.2.0-mykernel' --unicode \
    'root=UUID=<root-uuid> rw initrd=\initramfs-7.2.0-mykernel.img'
```

or installs **systemd-boot** (`bootctl install`), which keeps plain entries in
`/boot/efi/loader/entries/*.conf` pointing at kernel + initramfs on the ESP.
systemd-boot is also common on other distributions; it coexists with GRUB and other OS
entries. FAT32 cannot hold symlinks. Copy real files.

### Secure Boot and signing (MOK route)

Two independent signatures matter.

1. **Kernel image**. Firmware verifies the EFI binary. Enroll your own key in MOK
   (Machine Owner Key) db, then sign.

```text
$ openssl req -new -x509 -newkey rsa:2048 -keyout MOK.key -out MOK.crt \
      -nodes -days 3650 -subj "/CN=my-kernel/"
$ sudo mokutil --import MOK.crt          # set a one-time password, reboot, enroll
# after reboot:
$ sudo sbsign --key MOK.key --cert MOK.crt \
      --output /boot/vmlinuz-7.2.0-mykernel /boot/vmlinuz-7.2.0-mykernel
```

(`sbctl` from the repos automates the whole dance and can re-sign on every kernel
update.)

2. **Modules**. With `MODULE_SIG=y` + `MODULE_SIG_FORCE` the kernel rejects unsigned
   modules. Sign with the SAME key, using
   `scripts/sign-file sha512 MOK.key MOK.crt module.ko`, or enroll the key into the
   kernel's trusted ring via `CONFIG_SYSTEM_TRUSTED_KEYS` at build time.

Simplest policy while experimenting is to leave SB disabled. Sign properly once your
kernel is stable enough to protect.

## First boot and validation

Pre-flight checklist.

- Old distro kernel still installed and listed in GRUB (it is, so never remove it while
  testing).
- `/boot` has `vmlinuz-7.2.0-mykernel` + matching initrd + correct names in
  `grub.cfg` (names must match EXACTLY, including the localversion suffix).
- **Config sanity**. `scripts/config --file .config -s DEVTMPFS CGROUPS AHCI EXT4_FS
  EFI` all resolve enabled.

Reboot, select your custom kernel in the GRUB advanced submenu (or set `GRUB_DEFAULT`).
Then validate with the commands below.

```text
$ uname -r                       # 7.2.0-mykernel  <- proof
$ sudo dmesg | less              # scan for failed firmware loads, ata errors,
                                 #  nouveau issues, "unable to mount" panics
$ lspci -k                       # drivers-in-use column: correct driver loaded?
$ journalctl -b -p err..alert    # boot-scoped error sweep
$ cat /proc/cpuinfo | grep MHz   # frequency scaling alive?
$ systemctl --failed
```

Graphics. If you use an in-tree GPU driver (nouveau, amdgpu, etc.) and X/Wayland fails
on the new kernel, first suspect a renamed/missing driver in your pruned config
(`lsmod | grep <driver>`).

Network down? The NIC driver got dropped by overzealous `localmodconfig`? Re-add,
rebuild, reinstall modules + initramfs.

### Kernel command line and runtime administration

Runtime knobs worth knowing on any kernel you run follow.

- `/proc/cmdline` shows the effective boot parameters.
- `/sys/module/<module>/parameters/*`. Live module params; persistent ones go on the
  cmdline.
- `sysctl`. `/etc/sysctl.d/*.conf`, e.g. `vm.swappiness`,
  `kernel.split_lock_mitigate=0`.
- `modprobe/rmmod/modinfo` for module lifecycle; `/etc/modprobe.d/*.conf` for
  blacklist/options persistence. For example, to pin parameters and blacklist a driver:

```text
# /etc/modprobe.d/my-settings.conf
options i915 enable_psr=0        # set a module parameter persistently
blacklist nouveau               # prevent autoloading this driver
install nvidia /sbin/modprobe --ignore-install nvidia && echo "nvidia hooked"
```

Parameters set here apply regardless of load order, which cmdline
`module.param=value` and `modinfo -p` can help you list.

- **Early firmware updates** come from `/etc/default/initramfs-tools` or the
  `amd64-microcode`/`intel-microcode` packages get bundled into the initramfs.
  Regenerate it after CPU microcode updates.

## Third-party (out-of-tree) modules and DKMS

Anything not in-tree (proprietary NVIDIA, VirtualBox, WireGuard on ancient kernels,
ZFS) builds against a kernel's headers + `Module.symvers`.

```text
$ make -C /lib/modules/$(uname -r)/build M=$PWD modules   # generic recipe
```

`/lib/modules/<rel>/build` is a symlink back to your prepared tree (or the installed
headers package). This is why Method B's headers `.deb` matters, and why deleting your
source tree breaks future module builds. Keep it, or rely on the installed headers
package.

DKMS automates rebuild-on-every-kernel-update.

```text
# apt install dkms nvidia-driver nvidia-kernel-dkms    # Debian example
# dkms status                                          # shows per-kernel state
```

When you boot the new kernel the first time, DKMS builds the module for it (on Debian,
triggered at package install/boot via `/usr/lib/dkms`; check `dkms status` for
`installed` against your release). Nouveau-vs-proprietary conflicts are managed via
`/etc/modprobe.d/blacklist-nouveau.conf`.

### DKMS for your own out-of-tree module

DKMS is not only for distro packages. To make your own module rebuild automatically on
every kernel you boot, install its source under `/usr/src/` with a `dkms.conf` and
register it:

```text
# sudo mkdir -p /usr/src/my-driver-1.0
# sudo cp -r /path/to/source/* /usr/src/my-driver-1.0/
# sudo tee /usr/src/my-driver-1.0/dkms.conf >/dev/null <<'EOF'
PACKAGE_NAME="my-driver"
PACKAGE_VERSION="1.0"
BUILT_MODULE_NAME[0]="my_driver"
DEST_MODULE_LOCATION[0]="/kernel/drivers/misc"
MAKE[0]="make -C ${kernel_source_dir} M=${dkms_tree}/${PACKAGE_NAME}/${PACKAGE_VERSION}/build modules"
AUTOINSTALL="yes"
EOF
# sudo dkms add -m my-driver -v 1.0
# sudo dkms build -m my-driver -v 1.0
# sudo dkms install -m my-driver -v 1.0
```

Once `AUTOINSTALL=yes` is set, every kernel that is installed (enabling its headers)
gets the module rebuilt and installed automatically — shipped under
`/lib/modules/<rel>/updates/`, exactly where modprobe looks. This mirrors how packaged
DKMS drivers work and is the simplest way to keep a project driver in sync with your
rolling custom kernels.

## Iterating with updates, patches, cleaning

### Cleaning targets, and what each destroys

| Target | Effect |
|---|---|
| `make clean` | Removes generated objects/images, KEEPS `.config` and enough state for fast incremental rebuilds. |
| `make mrproper` | `clean` + deletes `.config`, backups, `include/config`, tags. Back to pristine tarball state. |
| `make distclean` | `mrproper` + editor/patch leftovers (`*.orig`, `*.rej`). |
| `git clean -fdx` (git trees) | nuclear; same spirit as mrproper. |

### Moving to the next version

```text
$ cd ~/Code/linux-7.3        # new tree (or git checkout v7.3.0)
$ cp ~/kernel-configs/7.2.0-mykernel.cfg .config
$ make olddefconfig          # absorb renames/additions with defaults
$ diff <(sort ~/kernel-configs/7.2.0-mykernel.cfg) <(sort .config)  # audit drift
```

Update `LOCALVERSION` if you encode the version there, then build as usual. Old kernels
remain independently installed. GRUB keeps entries until you delete their `/boot` files
+ `/lib/modules` dirs (or `apt purge` the debs). Housekeeping rule. Keep the last 2–3
known good kernels maximum.

### Carrying patches

Small experiments can be done by editing in place and keeping a `git diff > patch`
(git trees) or `quilt` series (tarball trees; Debian's own packaging uses quilt). For
anything durable, a git tree with topic branches pays for itself immediately;
`git format-patch`/`am` round-trips changes between machines.

## Other machines with cross-building, deploying, testing

Four distinct scenarios get conflated. Identify yours first.

1. Same architecture, **different physical computer** (build laptop → desktop). No
   cross tools needed; portability of the *config* is the issue.
2. Different architecture (x86_64 host → ARM SBC). Genuine cross-compilation.
3. Faster host, same machine. Distributed/cached builds (distcc, ccache, containers).
4. Testing without rebooting. VMs, QEMU direct-kernel-boot, kexec.

### Scenario 1, build here, run there (same arch)

Config portability rules follow.

- Start from a *generic* config (distro config or `defconfig`), NOT from
  `localmodconfig` output, because the target machine has different hardware.
- Avoid `LOCALVERSION` collisions if two machines share /boot via removable media;
  distinct suffixes prevent module mixups.

Deployment unit options follow.

```text
# 1) Packages (best): build debs on host, install on target
$ make bindeb-pkg -j$(nproc)
$ scp ../*7.2.0-mykernel*.deb target:/tmp/  && ssh target sudo dpkg -i /tmp/*.deb

# 2) Staged tree: modules to a prefix, rsync whole thing
$ make INSTALL_MOD_PATH=/tmp/stage modules_install
$ rsync -a arch/x86/boot/bzImage target:/tmp/
$ rsync -a /tmp/stage/lib/modules/7.2.0-mykernel target:/lib/modules/
```

Then, on the target, generate its initramfs there (initramfs content is
host-layout-sensitive), run its bootloader update (`update-grub` / `bootctl`), reboot.
Copying a finished initramfs between machines works only when distro, generator and
layout match. Usually not worth the fragility.

### Scenario 2, cross-compilation

Two variables drive everything. They are target architecture (`ARCH=`) and toolchain
prefix (`CROSS_COMPILE=`).

| Target | `ARCH=` | `CROSS_COMPILE=` | Debian toolchain pkg |
|---|---|---|---|
| ARM64 (RPi 4/5, servers) | `arm64` | `aarch64-linux-gnu-` | `gcc-aarch64-linux-gnu` |
| ARM 32 (older SBCs) | `arm` | `arm-linux-gnueabihf-` | `gcc-arm-linux-gnueabihf` |
| RISC-V | `riscv` | `riscv64-linux-gnu-` | `gcc-riscv64-linux-gnu` |
| x86_64 from ARM host | `x86_64` | `x86_64-linux-gnu-` | `gcc-x86-64-linux-gnu` |
| PowerPC64LE | `powerpc` | `powerpc64le-linux-gnu-` | `gcc-powerpc64le-linux-gnu` |
| LoongArch | `loongarch` | `loongarch64-linux-gnu-` | `gcc-loongarch64-linux-gnu` |

Recipe pattern (arm64 example) follows.

```text
$ make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig
$ make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc)
# product: arch/arm64/boot/Image.gz ; boards needing DTBs also emit .dtb files
$ make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- \
      INSTALL_MOD_PATH=/tmp/stage modules_install
```

With LLVM one compiler covers all backends. `make LLVM=1 ARCH=arm64` (prefix
inferred). Architecture notes follow.

- `defconfig` is arch-relative. It means "this ARCH's default board config" (e.g.
  `arch/arm64/configs/defconfig`).
- Embedded ARM boards boot via U-Boot + extlinux.conf or boot.scr, frequently requiring
  a Device Tree Blob matched to the board; vendor kernels often carry patches mainline
  lacks.
- **Deploy**. Kernel image + DTB into the target's boot partition (often FAT), modules
  via staged rsync, initramfs generated on target (or omitted when root is simple and
  built-in).

Native emulation alternative. `debx` chroots or `qemu-user-static + binfmt` run the
*target's* gcc via translation. Slower than true cross, but sidesteps cross-toolchain
quirks. Containers (multiarch Docker/debuerreotype) formalize this.

### Scenario 3, making THIS machine's builds faster

- **ccache** ([ccache](#ccache)) is the biggest win across repeated config experiments.
- **distcc**. Spread compilations over LAN hosts; needs identical compiler major
  versions everywhere; kernel-friendly (`make CC="distcc gcc" -j12` with `-j` summing
  the fleet). Only compile phases distribute; linking stays local.
- **Prune config**. `localmodconfig` on a personal machine easily halves module count.
  Debug-info off ([Debug info, the single biggest time/space
  lever](#debug-info-the-single-biggest-timespace-lever)).
- **tmpfs build dir**. `mount -t tmpfs -o size=24G tmpfs /mnt/kbuild`. Contents vanish
  on reboot (keep `.config` backed up outside!).
- **Thin LTO/incremental linkers**. Marginal here; measure before adopting.

### Scenario 4, test without risking the bootloader

#### QEMU direct kernel boot (safest)

```text
$ qemu-system-x86_64 -m 2G -enable-kvm -smp 4 \
    -kernel arch/x86/boot/bzImage \
    -initrd /boot/initramfs-7.2.0-mykernel.img \
    -append "root=/dev/vda rw console=ttyS0" \
    -drive file=testdisk.qcow2,if=virtio -nographic
```

Boots your kernel in a window with a scratch disk; host is untouched. Serial console
(`console=ttyS0` + `-nographic`) captures early boot logs that VGA swallows.

#### kexec, rebooting into the new kernel without firmware

```text
# kexec -l arch/x86/boot/bzImage \
    --initrd=/boot/initramfs-7.2.0-mykernel.img \
    --command-line="$(cat /proc/cmdline)"
# systemctl kexec          # graceful: stops services, jumps straight in
```

Seconds instead of a minute-plus POST cycle; ideal when iterating on config tweaks.
Failure modes are recoverable. A hung kexec boot still leaves the GRUB path intact after
a hard reset. Requires `KEXEC=y` (present in distro kernels; verify in YOUR kernel
config too if you want to chain further).

#### VM manager route

virt-manager/GNOME Boxes with a qcow2 + your debs installed gives a persistent test
guest exercising the full `dpkg -i` flow. This is closest rehearsal of the real
procedure.

## Troubleshooting matrix

| Symptom | Likely cause | Fix |
|---|---|---|
| GRUB menu lacks new kernel | Files misnamed in `/boot`; grub not regenerated | Check exact filenames; run `update-grub`; confirm `/boot` is where GRUB searches (not ESP). |
| Selected entry drops to GRUB rescue | `/boot` moved/partition changed after install | `grub-install` from live media; see [Recovery procedures](#recovery-procedures). |
| Kernel panic "unable to mount root fs" | Root driver missing from kernel AND initramfs; wrong `root=` | Boot old kernel; verify storage and filesystem drivers are enabled (or initramfs contains them); check UUID typo. |
| Panics instantly, no readable text | Panic before console init | Add `earlyprintk=vga,keep` / `console=tty0`; photograph screen. |
| Boot hangs at "Loading initial ramdisk" | Corrupt/truncated initrd; ESP/full `/boot` | Regenerate initramfs; `df -h /boot`; verify checksum against source. |
| "Unknown symbol" / vermagic mismatch on modprobe | Module from another kernel | `modinfo module.ko | grep vermagic`; rebuild module against THIS tree/headers. |
| Build error "certificate file missing" | Distro config imported to vanilla tree | Blank `SYSTEM_TRUSTED_KEYS`/`REVOCATION_KEYS` ([Machine-critical symbols (checklist)](#machine-critical-symbols-checklist)). |
| Build error mentioning pahole/BTF | `dwarves` not installed or stale | `apt install dwarves` or disable `DEBUG_INFO_BTF`. |
| `depmod: FATAL: could not search modules` in `update-initramfs` | Ran initramfs before `make modules_install`, or `-k` name mismatch | Run `sudo make modules_install` first; verify `ls /lib/modules/<kver>` matches `-k <kver>`; repeat `O=` if out-of-tree. |
| Random `undefined reference` after config flip | Stale objects | `make olddefconfig && make prepare`, worst case `make clean`. Never hand-edit `.config` without re-running `olddefconfig` (dependencies unresolved). |
| X/Wayland dead after boot | GPU driver missing from pruned config | Re-enable via `./scripts/config --module <DRIVER>`, rebuild. |
| No network | NIC driver pruned | Re-enable as above. |
| Fan/noise/thermal oddities | Missing power management options | Restore ACPI/power sections from distro config. |
| `dpkg -i` complains about signature/version | Rebuilt same version | Bump `KDEB_PKGVERSION` or `--force-downgrade` knowingly. |
| Disk fills during build | Debug info enabled | Disable `DEBUG_INFO`; `make clean`; check `du -sh .`. |

### Decoding oopses

A crash dump lists `PC is at funcname+0xoffset/0xsize` plus a call trace. With
`System.map-<rel>` installed, addresses symbolicate; better result is
`CONFIG_UNWINDER_ORC` + serial/netconsole capture, or feed `dmesg` trace into
`/usr/src/linux/scripts/decodecode`. For reproducible bugs, note exact cmdline, config,
and whether the previous kernel of the same tree misbehaves (bisect territory, git
trees shine).

## Recovery procedures

Golden rule. **Never** uninstall the last bootable kernel. Keep the distro kernel until
your custom kernel has survived a week of daily use.

1. **Wrong kernel selected or new kernel broken**. Reboot, GRUB → Advanced options →
   pick the distro kernel. Done.
2. **New kernel breaks something subtle**. Same, then fix config, rebuild, reinstall.
   Old kernel unaffected because releases are fully isolated (`/boot/vmlinuz-*`,
   `/lib/modules/*`, initramfs per-release).
3. **Cannot boot at all**. Use a Debian live USB →

```text
# mount /dev/sda2 /mnt && mount /dev/sda1 /mnt/boot/efi
# mount --bind /dev /mnt/dev && mount --bind /proc /mnt/proc \
   && mount --bind /sys /mnt/sys
# chroot /mnt
# update-grub && grub-install            # if bootloader suspect
# apt purge linux-image-7.2.0-mykernel   # if kernel package suspect
```

4. **Manual cleanup of a botched Method-A kernel**. Delete the kernel artifacts and
   module tree, then re-sync the bootloader:

```text
$ sudo rm /boot/vmlinuz-7.2.0-mykernel /boot/initrd.img-7.2.0-mykernel \
        /boot/System.map-7.2.0-mykernel /boot/config-7.2.0-mykernel
$ sudo rm -rf /lib/modules/7.2.0-mykernel
$ sudo update-grub
```

5. **firmware bricked fears** are irrelevant. Kernel flashing does not touch BIOS/UEFI
   flash; worst case is a bad boot entry (fixable via live media or
   `efibootmgr -B -b XXXX`).

## The .config, a complete reference

This section is a comprehensive, option-by-option reference for the kernel's
configuration system. It covers every significant symbol you will encounter in
`make menuconfig`, organized by the menu hierarchy you see on screen. Defaults quoted
here are the values a freshly generated `make defconfig` would use for a vanilla x86_64
tree; your actual values depend on your starting config and kernel version.

### How to use this reference

Open a terminal in your source tree and run make menuconfig.

```text
$ make menuconfig
```

Navigate to a menu (e.g. "General setup"). For each option, consider the following.

- The **symbol name** is shown as `CONFIG_SYMBOL_NAME`.
- The **type** tells you whether it is a boolean (`y/n`), tristate (`y/m/n`. Built-in,
  module, or off), integer, or string.
- **Dependencies** list other symbols that must be enabled first.
- **Default** is what happens if you press "Save" without changing anything.
- **Guidance** tells you when to enable, disable, or leave at default, with practical
  reasoning. Not just restating the help text.

You can look up any symbol interactively in menuconfig by pressing `/` and typing the
symbol name.

This reference is built for Linux kernel 7.2. Symbols, defaults, and dependencies shift
between versions. If you are building a different release, cross-check the in-tree
`Kconfig` source files for the authoritative definition. The defaults below mirror
`make defconfig` on a vanilla x86_64 7.2 tree.

## Appendix A, Command cheat sheet

```text
## Configure
make mrproper                          # pristine tree (kills .config!)
cp /boot/config-$(uname -r) .config    # clone running kernel's config
zcat /proc/config.gz > .config 2>/dev/null || true  # alternative if available
make olddefconfig                      # reconcile imported config
make nconfig                           # curses UI ('/' searches)
./scripts/config -e SYM / -d SYM / -m SYM / --set-str SYM "val"
make savedefconfig                     # minimal delta dump
## Build
make -j$(nproc)                        # full build
make O=out -j$(nproc)                  # out-of-tree objects
make LLVM=1 -j$(nproc)                 # clang toolchain
make CC="ccache gcc" -j$(nproc)
## Install (pick ONE route)
sudo make modules_install              # A: modules
sudo cp arch/x86/boot/bzImage /boot/vmlinuz-<REL>
sudo update-initramfs -c -k <REL>      # A: initramfs (Debian)
sudo update-grub                       # A: bootloader (Debian)
make bindeb-pkg -j$(nproc)             # B: .debs -> parent dir
sudo dpkg -i ../linux-image-*_<REL>_*.deb ../linux-headers-*_<REL>_*.deb
## Inspect / operate
uname -r ; dmesg ; journalctl -b ; lspci -k ; lsmod
modinfo <mod> ; sudo modprobe <mod> ; systool -m <mod> -v
cat /proc/cmdline ; cat /config 2>/dev/null || zcat /proc/config.gz
## Test fast
sudo kexec -l bzImage --initrd=... --command-line="$(cat /proc/cmdline)" \
  && sudo systemctl kexec
qemu-system-x86_64 -enable-kvm -kernel bzImage -initrd rd.img -append "..."
## Maintain
make clean / mrproper / distclean
cp .config ~/kernel-configs/...        # BACK UP BEFORE EXPERIMENTS
```

## Appendix B, References

- In-tree docs (authoritative, version-matched to your tree) cover
  `Documentation/process/changes.rst` (toolchain mins), `Documentation/kbuild/*.rst`,
  `Documentation/admin-guide/**`, `Documentation/dev-tools/**`.
- Debian Kernel Handbook, ch. 4 "Common kernel-related tasks" is at
  [kernel-team.pages.debian.net](https://kernel-team.pages.debian.net/kernel-handbook/ch-common-tasks.html)
- Debian Handbook, kernel compilation chapter, is at
  [www.debian.org](https://www.debian.org/doc/manuals/debian-handbook/sect.kernel-compilation.html)
- kernel.org signatures howto is at
  [www.kernel.org](https://www.kernel.org/signature.html)
- Debian Secure Boot / MOK is at
  [wiki.debian.org](https://wiki.debian.org/SecureBoot)