window.addEventListener("message", async function(e) {
  if (!e.data || e.data.type !== "CUBLITZ_FETCH") return;
  var id = e.data.id;
  try {
    var resp = await fetch(e.data.url, e.data.options || {});
    var text = await resp.text();
    window.postMessage({ type: "CUBLITZ_FETCH_RESULT", id: id, ok: resp.ok, status: resp.status, text: text }, "*");
  } catch(err) {
    window.postMessage({ type: "CUBLITZ_FETCH_RESULT", id: id, ok: false, error: err.message }, "*");
  }
});
