# Container sources

`seccomp.json` derives from Microsoft's Playwright v1.63.0 [Docker seccomp profile](https://github.com/microsoft/playwright/blob/v1.63.0/utils/docker/seccomp_profile.json), licensed under Apache 2.0; see `LICENSE.playwright`. The original byte digest was `cc3e61cabda6bbc1e53e54d27ba4d55a9d3be829b6dd1a596f4a7b31b1cc7849`.

The local change permits the `chroot` syscall without a Docker host-capability condition. Chromium needs it inside its own user namespace. The container still drops every host capability, enables no-new-privileges, runs as `node` and explicitly enables the Chromium sandbox. The first launch with the unchanged upstream profile failed at Chromium's namespace-local chroot; no sandbox-disable fallback was added.

The Node base image is pinned by manifest digest in `Dockerfile`. Yarn dependencies and the Chromium revision are pinned separately. OS packages installed during image build are recorded by the resulting image, not represented as a bit-for-bit reproducible apt snapshot.
