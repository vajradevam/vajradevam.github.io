---
title: "Compiling the Linux kernel, then testing it in QEMU"
pubDate: 2026-10-11
tags: [linux, kernel, qemu]
description: "Build a kernel on Arch or Debian, install it, boot it safely in QEMU, and automate the whole loop with the kernel's own tests."
---

I wanted to learn kernel programming, which meant I needed a loop I could run a dozen times a day: change some code, build, boot, see what broke. This post is that loop. Nothing here is about kernel internals. It is just the machinery that lets you touch the internals without reinstalling your machine every week.

## Why build your own kernel

You cannot learn this stuff by reading alone. A kernel change means nothing until it boots or panics.

So the goal is a tight edit, build, boot, test cycle. The first half of this post builds a full kernel you could install. The second half shows why you should rarely boot it on real hardware, and what to do instead.

## Get the source and build dependencies

I get the source from [kernel.org](https://www.kernel.org/). Pick the latest stable tag; I use `<tag>` below as a placeholder.

```bash
git clone --depth 1 --branch <tag> https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git
cd linux
```

The tarball from kernel.org works the same way if you prefer it. Clone is just easier to update later.

Dependencies differ by distro, but not by much. You need a compiler, `bc`, `flex`, `bison`, OpenSSL and ELF headers, ncurses for configuration, and `pahole` for debug-info encoding. The rest is plumbing for packaging and initramfs generation.

On Debian:

```bash
sudo apt update
sudo apt install build-essential bc bison flex libssl-dev libelf-dev libncurses-dev dwarves cpio kmod rsync
```

On Arch:

```bash
sudo pacman -Syu base-devel bc cpio perl tar xz pahole libelf ncurses openssl
```

These match the current [Debian kernel handbook](https://kernel-team.pages.debian.net/kernel-handbook/ch-common-tasks.html) and the [Arch kernel build](https://wiki.archlinux.org/title/Kernel/Arch_build_system) requirements. If a name has changed since I wrote this, trust your distro docs over me.

## Configure

The Arch and Debian paths differ here, but only in where you steal your starting config from. In both cases you start from the running kernel's config, because it is the one config known to boot your machine.

On Debian:

```bash
cp /boot/config-$(uname -r) .config
make olddefconfig
```

On Arch:

```bash
zcat /proc/config.gz > .config
make olddefconfig
```

`make olddefconfig` answers every new option with its default, so you get a working config for the new version without a hundred prompts.

Two fixes before you build. First, the distro config points `SYSTEM_TRUSTED_KEYS` and `SYSTEM_REVOCATION_KEYS` at certificates you do not have, and the build fails looking for them:

```bash
scripts/config --disable SYSTEM_TRUSTED_KEYS --disable SYSTEM_REVOCATION_KEYS
```

Second, debug info makes the build slow and the output enormous. Turn it off while you are learning:

```bash
scripts/config --disable DEBUG_INFO --disable DEBUG_INFO_BTF
make olddefconfig
```

Two more things worth knowing. `make localmodconfig` shrinks the build to just the modules you currently have loaded, which is much faster — but anything unplugged or unloaded at that moment gets left out, so skip it until your loop works. And set a local version so your modules never collide with the distro kernel's:

```bash
scripts/config --set-str CONFIG_LOCALVERSION "-custom"
make olddefconfig
```

Your kernel will report itself as something like `vX.Y-custom`, with its modules safely under `/lib/modules/vX.Y-custom/`.

## Build

The build itself is one line:

```bash
make -j$(nproc)
```

I build out of tree so the source stays clean and I can keep several configs around:

```bash
make O=build -j$(nproc)
```

The result is `build/arch/x86/boot/bzImage` plus modules. If you rebuild often, install `ccache` and add it to your `PATH`; the second build of the same tree gets much faster.

This is the slow step the first time. Go make tea.

## Install it properly

Everything up to the initramfs is identical on both distros. Install the modules first:

```bash
sudo make modules_install
```

This is where the paths split again.

**Debian does it for you.** `sudo make install` runs Debian's `installkernel` hook, which copies the kernel, generates the initramfs, and updates GRUB. One command and you get a boot entry:

```bash
sudo make install
```

If you want cleaner bookkeeping, `make bindeb-pkg` builds proper `.deb` files you install with `dpkg -i`. Same result, easier to remove later.

**Arch needs a hand.** `make install` copies the image but does not build the initramfs, so do it yourself:

```bash
KVER=$(make kernelrelease)
sudo cp arch/x86/boot/bzImage /boot/vmlinuz-linux-custom
sudo mkinitcpio -k "$KVER" -g /boot/initramfs-linux-custom.img
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

If you use systemd-boot instead of GRUB, add an entry for `/boot/vmlinuz-linux-custom` and the new initramfs by hand; the `mkinitcpio` step is the same either way.

One safety note before you reboot: keep the distro kernel as a fallback entry, and do not boot the custom kernel on hardware yet. Test it in QEMU first. That is next.

## Test it in QEMU instead

QEMU can boot a kernel image directly with `-kernel`. No disk image, no GRUB, no install step. A crash costs you a few seconds and a log file, not a rescue USB.

There are three jobs: install the tools, build a small kernel plus a tiny initramfs, and boot them. Each is a few commands.

**Install the tools.** You need QEMU itself and a statically linked busybox. (`cpio` and `gzip` you already installed as build dependencies.)

On Debian:

```bash
sudo apt install qemu-system-x86 busybox-static
```

On Arch:

```bash
sudo pacman -S qemu-system-x86
```

Arch needs no busybox package: mkinitcpio already installed a static busybox at `/usr/lib/initcpio/busybox`, and you will reuse that file below. On Debian, locate yours with `dpkg -L busybox-static`.

**Check KVM.** Hardware acceleration is what makes the guest feel instant. Your CPU must have virtualization extensions and the kernel must expose them:

```bash
grep -E -c 'vmx|svm' /proc/cpuinfo
ls -l /dev/kvm
```

If the first number is zero or `/dev/kvm` is missing, drop `-enable-kvm` from the boot command below. Everything still works, just slowly.

**1. Build a small guest kernel.** You do not want your giant distro config here. Build a minimal one:

```bash
make O=build defconfig
make O=build kvm_guest.config
make O=build -j$(nproc)
```

`defconfig` is the default x86 config. `kvm_guest.config` adds the paravirtual guest options QEMU likes. The result builds fast because it skips most drivers.

**2. Build a tiny initramfs.** Stay in the kernel source root — the same directory holding `build/` from step 1. The kernel needs something to run as PID 1, or it panics, so stage the guest filesystem in an `initramfs/` directory right there, next to the kernel output:

```text
linux/                  # kernel source root, your working directory
  build/arch/x86/boot/bzImage
  initramfs/            # staging directory you are about to create
    init
    bin/busybox
```

Copy the binary in and confirm it is static — a dynamically linked one fails at boot with no libraries around it:

```bash
mkdir -p initramfs/bin
cp /usr/lib/initcpio/busybox initramfs/bin/busybox   # Arch; on Debian use the path from dpkg -L busybox-static
file initramfs/bin/busybox   # must say "statically linked"
```

Save this as `initramfs/init`. It is a plain shell script, and it must be executable since the kernel runs it directly:

```bash
#!/bin/sh
mount -t proc none /proc
mount -t sysfs none /sys
echo "HELLO-FROM-INIT"
poweroff -f
```

Then pack the staging directory into a single image. Run this from the source root, so `initramfs.cpio.gz` lands next to `build/`, exactly where the boot command below expects it. The `cpio` newc format plus gzip is what the kernel expects:

```bash
cd initramfs
chmod +x init
find . -print0 | cpio --format=newc --create --null | gzip > ../initramfs.cpio.gz
cd ..
```

Note what QEMU actually reads: the packed `initramfs.cpio.gz`, never the `initramfs/` directory. The directory is just scaffolding — you can delete and recreate it freely. Its location is arbitrary, but keeping it in the source root means every relative path in this post works as written.

**3. Boot it.** One command, from the kernel source root:

```bash
qemu-system-x86_64 -enable-kvm -m 1G -nographic \
  -kernel build/arch/x86/boot/bzImage \
  -initrd initramfs.cpio.gz \
  -append "console=ttyS0 panic=-1"
```

`-nographic` sends the serial console to your terminal. `console=ttyS0` tells the kernel to log there. `panic=-1` reboots immediately on panic instead of hanging, which matters when this runs under a script.

Success looks like your `HELLO-FROM-INIT` line scrolling by, then the guest powers off and QEMU exits. To quit a running guest by hand, press `Ctrl-a x`.

When it breaks — and it will — add `-s -S` to the QEMU line. That makes QEMU listen on `localhost:1234` and freeze the guest at start. Then in another terminal:

```bash
gdb vmlinux
(gdb) target remote localhost:1234
(gdb) c
```

You get source-level debugging of the running kernel against `vmlinux`.

If even the initramfs feels like setup, use [virtme-ng](https://github.com/arighi/virtme-ng). It boots your freshly built kernel with the host filesystem, so there is no rootfs to build at all:

```bash
sudo apt install virtme-ng   # or: sudo pacman -S virtme-ng
vng --run ./build/arch/x86/boot/bzImage
```

That is the zero-setup shortcut. I still keep the busybox initramfs around for scripted tests, because it boots in about a second and its output is trivial to grep.

## Automate the compile-and-test loop

Once QEMU boots in seconds, the whole loop fits in one script. Mine is called `ktest.sh`:

```bash
#!/bin/bash
set -euo pipefail

BUILD_DIR="${BUILD_DIR:-build}"
INITRD="${INITRD:-initramfs.cpio.gz}"
LOG="${LOG:-ktest.log}"
MARKER="HELLO-FROM-INIT"
TIMEOUT="${TIMEOUT:-120}"

make O="$BUILD_DIR" -j"$(nproc)"
KVERSION=$(make -s O="$BUILD_DIR" kernelrelease)
echo "Built $KVERSION"

timeout "$TIMEOUT" qemu-system-x86_64 -enable-kvm -m 1G -nographic \
  -kernel "$BUILD_DIR/arch/x86/boot/bzImage" \
  -initrd "$INITRD" \
  -append "console=ttyS0 panic=-1" 2>&1 | tee "$LOG" || true

if grep -q "Kernel panic" "$LOG"; then
  echo "FAIL: kernel panic"
  exit 1
fi

if grep -q "$MARKER" "$LOG"; then
  echo "PASS: found marker $MARKER ($KVERSION)"
  exit 0
fi

echo "FAIL: marker not found, see $LOG"
exit 1
```

It builds incrementally, boots under `timeout`, saves the serial console to `ktest.log`, and fails on panics or a missing marker. The `|| true` after QEMU is deliberate: QEMU exits nonzero when the guest powers off, and I want the grep to decide pass or fail, not the exit code.

That covers boot testing. For actual kernel code, use the kernel's own suites.

**KUnit is the fast one.** It builds the kernel with unit tests and runs them under QEMU or UML. Start with everything:

```bash
./tools/testing/kunit/kunit.py run
```

Run one suite with a filter:

```bash
./tools/testing/kunit/kunit.py run --filter_glob=<suite-name>
```

Add `--arch=x86_64` to force the QEMU backend instead of UML. The [KUnit docs](https://www.kernel.org/doc/html/latest/dev-tools/kunit/index.html) have the full flag list; `--jobs=$(nproc)` helps on big runs.

**kselftest is the userspace one.** These live under `tools/testing/selftests/` and are meant to run inside a booted kernel — through the QEMU initramfs above, or inside `vng`. Build and run one target:

```bash
make -C tools/testing/selftests TARGETS=<name> run_tests
```

Use a real target name from `tools/testing/selftests/Makefile`, for example `TARGETS=net` or `TARGETS=timers`. Do not guess; the Makefile is the list.

The learning loop is then concrete. A good first exercise is a hello-world module or a trivial KUnit test in `lib/kunit/`. Edit the file, run `./ktest.sh` or the KUnit command, read the log. When the marker says `PASS`, change something else. That is the whole habit.

## Closing

One script, one QEMU command, two test suites. Run the loop until booting a kernel you built feels boring.

Same kernel, less fear.

## Further reading

- [kernel.org source and docs](https://www.kernel.org/)
- [Debian kernel handbook, common tasks](https://kernel-team.pages.debian.net/kernel-handbook/ch-common-tasks.html)
- [ArchWiki: Kernel traditional compilation](https://wiki.archlinux.org/title/Kernel/Traditional_compilation)
- [ArchWiki: mkinitcpio](https://wiki.archlinux.org/title/Mkinitcpio)
- [QEMU direct Linux boot](https://www.qemu.org/docs/master/system/linuxboot.html)
- [QEMU GDB usage](https://www.qemu.org/docs/master/system/gdb.html)
- [ArchWiki: QEMU](https://wiki.archlinux.org/title/QEMU)
- [Debian Wiki: QEMU](https://wiki.debian.org/QEMU)
- [KUnit unit testing](https://www.kernel.org/doc/html/latest/dev-tools/kunit/index.html)
- [Linux kernel selftests](https://docs.kernel.org/dev-tools/kselftest.html)
- [virtme-ng](https://github.com/arighi/virtme-ng)
