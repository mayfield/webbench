all: wasm references


wasm:
	em++ -Wall -O3 \
		-sSTACK_SIZE=131072 \
		-sINITIAL_MEMORY=4194304 \
		-sALLOW_MEMORY_GROWTH=1 \
		-sEXPORTED_FUNCTIONS=_renderBlock \
		-sMODULARIZE=1 \
		-sASSERTIONS=0 \
		-sEXPORT_NAME=renderWASM \
		src/render.cpp -o bin/render.js

references:
	g++ -Wall -O3 -fopenmp src/smallpt.cpp -o bin/smallpt-gcc
	clang++ -Wall -O3 -fopenmp src/smallpt.cpp -o bin/smallpt-clang

lint:
	npx eslint *.mjs worker.js


.PHONY: references wasm
