function test() {
  for (let i = 1; i < 6; i++) {
    const div = document.createElement("div");

    const h2 = document.createElement("h2");
    h2.textContent = "Bidrag " + i;

    div.classList.add("bidrag-cont");
    div.id = `bidrag-${i}`;
    div.dataset.bidrag = i;

    div.append(h2);
    document.querySelector(".cont").append(div);
  }
}

function renderBidrag() {
  document.querySelectorAll(".bidrag-cont").forEach((cont) => {
    const form = document.createElement("form");

    for (let i = 0; i < 4; i++) {
      const slider = makeSlider(i);
      form.append(slider);
    }
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Spara";

    cont.append(form);
    form.append(submitButton);
  });
}
function makeSlider(i) {
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "5";
  slider.value = "3";
  return slider;
}

test();
renderBidrag();
