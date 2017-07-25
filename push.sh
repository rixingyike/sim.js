#!/bin/bash
COMMENT="`date +%Y-%m-%d`:$1"
echo $COMMENT
git add ./;git commit -m $COMMENT; git push