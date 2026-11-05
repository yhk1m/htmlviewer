export function gridIndex(N) {
  const index = new Uint32Array((N - 1) * (N - 1) * 6);
  let n = 0;
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
    index[n++] = a; index[n++] = c; index[n++] = b;
    index[n++] = b; index[n++] = c; index[n++] = d;
  }
  return index;
}

// heightAt(k): k번 칸의 그릴 높이. cell: 칸 간격.
export function fillNormals(N, cell, heightAt, out) {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const nx = (heightAt(il) - heightAt(ir)) / (((ir - il) || 1) * cell);
    const nz = (heightAt(jl) - heightAt(jr)) / ((((jr - jl) / N) || 1) * cell);
    const l = Math.hypot(nx, 1, nz);
    out[k * 3] = nx / l; out[k * 3 + 1] = 1 / l; out[k * 3 + 2] = nz / l;
  }
}
