all: wasmorig
	g++ -Wall -O3 -fopenmp smallpt.cpp -o smallpt

		#-fno-exceptions \
		#-ffast-math \
		#-fno-math-errno \

wasmorig:
	em++ -Wall -O3 \
		-flto \
		-Wl,--lto-O3 \
		-sSTACK_SIZE=33554432 \
		-sINITIAL_MEMORY=134217728 \
		-sMALLOC=dlmalloc \
		-sEXPORTED_FUNCTIONS=_renderBlock \
		-sMODULARIZE=1 \
		-sEXPORT_NAME=renderWASM \
		render.cpp -o render.js

wasm:
	em++ -Wall -O3 \
		-g3 \
		-flto \
		-Wl,--lto-O3 \
		-sSTACK_SIZE=33554432 \
		-sINITIAL_MEMORY=134217728 \
		-sMALLOC=dlmalloc \
		-sSIDE_MODULE=1 \
		-sMODULARIZE=1 \
		-sEXPORT_NAME=renderWASM \
		render.cpp -o render.wasm
