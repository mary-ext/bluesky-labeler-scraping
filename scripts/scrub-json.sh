#!/usr/bin/env bash

find labelers -name "*.json" -type f | while read file; do
	jq 'del(.likeCount, .["$type"])' "$file" > "$file.tmp"
	mv "$file.tmp" "$file"
done
