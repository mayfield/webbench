all: wasm references


wasm:
	em++ -Wall -O3 \
		-sSTACK_SIZE=8388608 \
		-sINITIAL_MEMORY=16777216 \
		-sALLOW_MEMORY_GROWTH=1 \
		-sEXPORTED_FUNCTIONS=_renderBlock \
		-sMODULARIZE=1 \
		-sEXPORT_NAME=renderWASM \
		render.cpp -o render.js

references:
	g++ -Wall -O3 -fopenmp references/smallpt.cpp -o smallpt-gcc
	clang++ -Wall -O3 -fopenmp references/smallpt.cpp -o smallpt-clang


.PHONY: references wasm
