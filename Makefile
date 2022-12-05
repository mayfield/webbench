all: wasm
	g++ -Wall -O3 -fopenmp smallpt.cpp -o smallpt

wasm:
	em++ -Wall -O3 \
		-flto \
		-Wl,--lto-O3 \
		-fno-exceptions \
		-ffast-math \
		-fno-math-errno \
		-sSTACK_SIZE=33554432 \
		-sINITIAL_MEMORY=134217728 \
		-sMALLOC=dlmalloc \
		-sEVAL_CTORS \
		-sWASM_BIGINT=1 \
		-sEXPORTED_FUNCTIONS=_renderBlock \
		-sMODULARIZE=1 \
		-sEXPORT_NAME=renderWASM \
		render.cpp -o render.js
	ls -l render.wasm
