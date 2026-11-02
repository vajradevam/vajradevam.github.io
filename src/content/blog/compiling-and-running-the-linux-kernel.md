---
title: Compiling and Running the Linux Kernel
pubDate: '2026-08-27'
description: Build and boot a vanilla Linux kernel from kernel.org on Arch and Debian-based
  systems. Exact commands only.
tags:
- linux
- kernel
- technical
- build-guide
---
Building your own kernel is just: get source, use your distro config, build, install, boot. Do it on Arch or Debian the same way, only the install tools differ.

Replace `X.Y.Z` below with the version you pick from [kernel.org](https://kernel.org), e.g. `6.12.10`. Never build as root. Only install steps need `sudo`. Keep your old distro kernel installed as fallback.

## 1. Install build tools

Debian / Ubuntu / Mint:

```bash
sudo apt update
sudo apt install build-essential libncurses-dev flex bison libssl-dev libelf-dev bc dwarves rsync xz-utils zstd cpio kmod pciutils fakeroot dpkg-dev git
```

Arch:

```bash
sudo pacman -Syu base-devel bc cpio gettext libelf pahole perl tar xz zstd openssl python git kmod
```

## 2. Get the source

Same on both:

```bash
mkdir -p ~/kernelbuild && cd ~/kernelbuild
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-X.Y.Z.tar.xz
tar -xf linux-X.Y.Z.tar.xz
cd linux-X.Y.Z
make mrproper
```

## 3. Configure

Copy your running kernel's proven config, then adapt it:

Arch (use `zcat` — `/boot/config-*` is root-only, hence `Permission denied`):

```bash
zcat /proc/config.gz > .config
make olddefconfig
```

Debian / Ubuntu / Mint:

```bash
cp /boot/config-$(uname -r) .config
make olddefconfig
```

Then set a unique name and fix the two things that break vanilla builds:

```bash
./scripts/config --set-str LOCALVERSION "-custom"
./scripts/config --disable LOCALVERSION_AUTO
./scripts/config --set-str SYSTEM_TRUSTED_KEYS ""
./scripts/config --set-str SYSTEM_REVOCATION_KEYS ""
./scripts/config --disable DEBUG_INFO --disable DEBUG_INFO_BTF --disable GDB_SCRIPTS
make olddefconfig
cp .config ~/kernelbuild/myconfig.cfg
```

This makes `uname -r` report `X.Y.Z-custom` so GRUB lists it next to your distro kernel, and disabling `DEBUG_INFO` cuts the build from hours / 15 GB to ~30 min / 2 GB.

Skip `localmodconfig` and `menuconfig` on your first build.

## 4. Build

Same on both:

```bash
make -j$(nproc)
```

If you get `Killed` or error 137, you ran out of RAM. Retry with `make -j4` or `make -j2`. Result is `arch/x86/boot/bzImage` plus thousands of `*.ko` modules.

## 5. Install

Pick one per distro.

### Debian: .deb packages (recommended)

```bash
make bindeb-pkg -j$(nproc) KDEB_PKGVERSION=$(make kernelversion)-1
sudo dpkg -i ../linux-image-*.deb ../linux-headers-*.deb
```

That already did modules + initramfs + GRUB. Skip to section 6.

### Arch: manual install

```bash
sudo make modules_install
sudo cp arch/x86/boot/bzImage /boot/vmlinuz-X.Y.Z-custom
sudo cp System.map /boot/System.map-X.Y.Z-custom
sudo cp .config /boot/config-X.Y.Z-custom
sudo mkinitcpio -k X.Y.Z-custom -g /boot/initramfs-X.Y.Z-custom.img
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

Debian manual fallback, if you don't want .debs:

```bash
sudo make modules_install
sudo cp arch/x86/boot/bzImage /boot/vmlinuz-X.Y.Z-custom
sudo cp System.map /boot/System.map-X.Y.Z-custom
sudo cp .config /boot/config-X.Y.Z-custom
sudo update-initramfs -c -k X.Y.Z-custom
sudo update-grub
```

Order matters: `modules_install` first, then copy to `/boot`, then initramfs, then bootloader. `update-initramfs` reads from `/lib/modules/<version>/`, so running it before `modules_install` gives an empty initramfs.

## 6. Boot and verify

Reboot, pick `Advanced options -> X.Y.Z-custom` in GRUB.

```bash
uname -r
sudo dmesg | less
journalctl -b -p err..alert
lspci -k
```

If graphics or network is missing, you pruned too much. Reboot into the old kernel, re-enable the driver, rebuild.

## 7. Update, rebuild, remove

```bash
make clean      # keeps .config, fast rebuild
# make mrproper # deletes .config, only with backup
```

New version:

```bash
cp ~/kernelbuild/myconfig.cfg .config
make olddefconfig
make -j$(nproc)
# then repeat section 5
```

Remove on Debian:

```bash
sudo apt purge linux-image-X.Y.Z-custom linux-headers-X.Y.Z-custom
```

Remove on Arch (manual):

```bash
sudo rm /boot/vmlinuz-X.Y.Z-custom /boot/initramfs-X.Y.Z-custom.img /boot/System.map-X.Y.Z-custom /boot/config-X.Y.Z-custom
sudo rm -rf /lib/modules/X.Y.Z-custom
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

Secure Boot: if it is off, ignore this. If on, either disable it in firmware while experimenting, or sign the kernel with your own MOK via `mokutil` + `sbsign`.
