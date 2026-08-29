# MKWii Noclip Coordinate Picker

A local-only coordinate-picking overlay for Mario Kart Wii scenes in [noclip.website](https://github.com/magcius/noclip.website).

It lets a user hold **Shift** and left-click a visible course surface to create a pin in native MKWii world coordinates (`X`, `Y`, `Z`). Pins stay anchored while the camera moves, can be edited numerically, and can be exported as JSON.

## What is included

- The noclip.website source tree, with the MKWii pin overlay integration.
- A loopback-only proxy/labeler server in `tools/shortcut-labeler/`.
- KMP checkpoint extraction and coordinate/raycast unit tests.

## What is deliberately not included

This repository contains **no game ISO, extracted Nintendo assets, course archives, collision meshes, user saves, ghost files, personal paths, credentials, or generated coordinate labels**. Obtain and extract any game data yourself and keep it under the ignored `data/` directory.

## Run locally

Prerequisites: Node.js 22+, pnpm 10+, Rust with `wasm32-unknown-unknown`, and the noclip.website build prerequisites.

```bash
pnpm install
rustup target add wasm32-unknown-unknown
cd rust
cargo install cargo-run-bin
cargo bin --install
cd ..
tools/shortcut-labeler/run-local.sh
```

The launcher binds only to loopback:

- `http://127.0.0.1:18088/three/#mkwii/boardcross_course` — textured 3D scene and picker
- `http://127.0.0.1:18088/` — 2D labeler

For a remote machine, use an SSH tunnel rather than exposing either port publicly:

```bash
ssh -N -L 18088:127.0.0.1:18088 user@host
```

## Using the 3D picker

1. Open an MKWii course in the `/three/` route.
2. Hold **Shift** and left-click a visible course surface.
3. Edit the selected pin with `X`, `Y`, and `Z`, then choose **Apply XYZ**.
4. Use **Download JSON** to export coordinates.

The rendered course triangles are the primary picking target. A local collision OBJ at `tools/shortcut-labeler/collision/data/<course-id>.obj` can optionally serve as a fallback; collision files are ignored and must not be committed.

## Verification

```bash
./node_modules/.bin/tsx tests/mkwii_pin_core.test.ts
./node_modules/.bin/tsc --noEmit --skipLibCheck
python3 -m unittest discover -s tools/shortcut-labeler/tests -v
node --test tools/shortcut-labeler/tests/core.test.js
```

## Upstream and licensing

This is a derived project based on `magcius/noclip.website`; the original upstream remote is retained as `upstream`. See `LICENSE` for upstream licensing and attribution.
