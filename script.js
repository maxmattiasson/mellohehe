function test() {
  for (let i = 1; i < 6; i++) {
    const div = document.createElement("div");
    div.textContent = "im number " + i;
    div.classList.add("bidrag-cont");
    div.id = `bidrag-${i}`;
    document.querySelector(".cont").append(div);
  }
}

function renderBidrag() {
  document.querySelectorAll(".bidrag-cont").forEach((cont) => {
    const h2 = document.createElement("h2");
    h2.textContent = "Bidrag";
    cont.append(h2);
  });
}
test();
renderBidrag();
