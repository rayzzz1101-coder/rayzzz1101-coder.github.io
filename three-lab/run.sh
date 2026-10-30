#!/bin/zsh
set -e

LAB_DIR="${0:A:h}"
NODE_BIN="${LAB_DIR:h}/.tools/node/bin"

export PATH="${NODE_BIN}:${PATH}"
cd "${LAB_DIR}"
exec "${NODE_BIN}/npm" run dev
