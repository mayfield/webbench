webbench
--------

Justin's WASM Web benchmark using a WebWorker threaded version of [smallpt](https://www.kevinbeason.com/smallpt/) ([non-recursive patch](https://www.kevinbeason.com/smallpt/forward.cpp))


Run Benchmark
--------
https://mayfield.github.io/webbench


Why
--------
I built a new workstation in the winter of 2022 so obviously I needed to run benchmarks for the first month to validate my purchase.  In doing so, I found that I really liked the [Cinebench R23](https://www.maxon.net/en/downloads/cinebench-r23-downloads) CPU benchmark YouTubers often showed when testing their systems.  However, as someone that uses multiple platforms, but mostly Linux, I wanted something browser based.

At first I found the benchmark at https://silver.urih.com/ to be quite good but upon further inspection I noticed its reliance on JavaScript for computation and some suboptimal Web Worker coordination presented bottlenecks for high core count systems.  On my AMD 7950X for example, I got best results by lowering the thread count artificially in DevTools.  Additionally, it fails to actually max out the TDP on my system.


About
--------
Webbench is a Clang/Emscripten compiled version of the non-recursive "Monte Carlo path tracing" C++ code linked at the top.  It has some minor modifications to allow it to be chunked and used as a library.  The main JavaScript thread coordinates a pool of Web Workers and feeds them blocks to render.  The results are passed back as RGB bitmap data and rendered to a canvas element.

On Firefox, my system is within about 1% of the native performance of the same code (using openmp for threading).  Pretty impressive if you ask me.  As noted below Chrome is the worst performer by a significant margin but I'd love to see this change over time.


Open Questions and Observations
--------
* On Linux (amd), MacOS (m1) and Windows (intel) **Chrome is consistenly the worst performer** by a significant margin.
* **Firefox and Webkit are fast (near native)**.
* On Apple silicon, Safari (WebKit) is slightly faster than Firefox.
* The original recursive version of smallpt runs into stack limit errors almost immediatly on Chrome and Safari.  There are no Emscripten compile flags that can completely resolve this (I tried extensively).  Before you scream "recursion is bad!!" remember that this is well established code that runs on just about anything when natively compiled.  It has a TINY memory footprint and the recursive function is very simple.  It **should** run just fine but instead its unusable.  I don't know who to blame here but something is rotten in the state of ~~Denmark~~ WASM.
* With modest tuning Firefox never had stack limit erros like Chrome and WebKit.
* I found it quite surprising that Firefox had the fewest issues and was the best performer on all platforms except Safari on M1, where it was still very close.  My typcial experience is that Firefox's JS performance is always bottom ranked and only its IndexedDB implementation ranks 1st.
