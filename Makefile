all: wasm

wasm:
	em++ -Wall -O3 \
		-sSTACK_SIZE=33554432 \
		-sINITIAL_MEMORY=134217728 \
		-sEXPORTED_FUNCTIONS=_renderBlock \
		-sMODULARIZE=1 \
		-sEXPORT_NAME=renderWASM \
		render.cpp -o render.js

references:
	g++ -Wall -O3 references/smallpt.cpp -o smallpt-gcc
	clang++ -Wall -O3 references/smallpt.cpp -o smallpt-clang


.PHONY: references wasm all
