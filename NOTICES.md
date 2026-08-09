# Notices

This project includes software developed by third parties and distributed under their respective licenses.

## OpenCode (SST)

COdo was initially derived from the OpenCode project. OpenCode is published under
the MIT License, copyright (c) opencode / SST. The full text of that license is
reproduced in `LICENSES/OPENCODE-LICENSE.txt`.

Where COdo continues to carry code structurally derived from OpenCode (session
core primitives, TUI rendering scaffolding, provider model abstractions), the
relevant copyright headers remain intact in the source. COdo's enhancements
(persona registry, sec-test, compose workflow, addon marketplace, scope-gate
runtime) are original work and carry the COdo copyright notice.

The relationship is "derivative work under a permissive license," not "fork." COdo
maintains its own roadmap, its own release cadence, its own feature set, and its
own security model. For the user-facing framing, see `README.md`.

## Third-party dependencies

Runtime dependencies are installed via Bun from the public npm registry and are
covered by their own licenses. See `bun.lock` for the resolved set.
