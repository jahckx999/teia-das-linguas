/* Página de verbo: áudio, sílabas e correções ao vivo */
document.addEventListener("DOMContentLoaded", async () => {
  const V = JSON.parse(document.getElementById("dados-verbo").textContent);
  const $ = s => document.getElementById(s);
  const fitaBtns = () => [...document.querySelectorAll("#fita .silaba")];
  $("b-en").onclick = () => TDL.falar(V.v, "en-US");
  $("b-lento").onclick = () => TDL.falar(V.v, "en-US", { rate: 0.55 });
  if ($("b-pt")) $("b-pt").onclick = () => TDL.falarAdaptado(V.pr);
  if ($("b-sil")) $("b-sil").onclick = () => TDL.falarSilabas(V.sil, fitaBtns());
  fitaBtns().forEach(b => b.onclick = () => TDL.falarAdaptado(b.dataset.sil, { rate: 0.7 }));
  document.querySelectorAll("[data-f]").forEach(b => b.onclick = () => TDL.falar(b.dataset.f, "en-US"));
  const c = (await TDL.correcoes("en"))[V.v];
  if (!c) return;
  if (c.pt) $("sig").textContent = c.pt;
  if (c.pr) { $("pr").textContent = c.pr; V.pr = c.pr; }
  if (c.sil) { V.sil = c.sil; $("fita").replaceChildren(TDL.fitaSilabas(c.sil)); }
  if (c.ex) {
    const [en, pt] = c.ex.split("=");
    $("ex").textContent = en.trim();
    if (pt) { const s = document.createElement("span"); s.style.display = "block"; s.style.color = "var(--tinta-2)"; s.textContent = pt.trim(); $("ex").append(s); }
  }
});
