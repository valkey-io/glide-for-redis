#!/bin/bash -e

TARGET="build"
if [ ! -z "$1" ]; then
    TARGET="$1"
fi

BASE_DIR=$(readlink -f $(dirname $(readlink -f $0))/..)

# For building the docs, we require mkdocs + mkdocstrings-python
function install_mkdocs() {
    MKDOCS=$(command -v mkdocs)
    if [ -z ${MKDOCS} ]; then
        echo "-- Installing mkdocs ..."
        pip3 install --break-system-packages    \
            mkdocs                              \
            mkdocstrings-python                 \
            pymdown-extensions                  \
            mkdocs-breadcrumbs-plugin           \
            mkdocs-material
        echo "-- Done"
    fi
    command -v mkdocs
}

function build_docs() {
    # NodeJS
    (cd ${BASE_DIR}/node && npm run docs)

    # Python - should be last, since Python docs are generated using mkdocs plugin
    # Set PYTHONPATH so python classes are found
    export PYTHONPATH=${BASE_DIR}/python/python:$PYTHONPATH
    (cd ${BASE_DIR}/docs && python3 -m mkdocs ${TARGET})
}

build_docs $1
