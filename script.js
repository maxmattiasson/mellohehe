const categories = ["Slay", "Utseende", "Låt", "Sångröst"];

test();
renderBidrag();

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

    const bidragId = cont.dataset.bidrag;

    for (let i = 0; i < categories.length; i++) {
      const slider = makeSlider(categories[i], bidragId, i);
      form.append(slider);
    }

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Spara";

    cont.append(form);
    form.append(submitButton);
  });
}
function makeSlider(cat, bidragId, sliderIndex) {
  const id = `b${bidragId}-c${sliderIndex}`;

  const label = document.createElement("label");
  label.textContent = cat;
  label.htmlFor = id;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "5";
  slider.value = "3";
  slider.classList.add("slider");
  slider.id = id;

  const p = document.createElement("p");
  p.classList.add("value-box");

  label.append(slider, p);
  return label;
}

document.querySelector(".cont").addEventListener("input", (e) => {
  if (!e.target.classList.contains("slider")) return;

  const slider = e.target;
  const valueBox = slider.nextElementSibling;

  valueBox.textContent = slider.value;
});

// function loadListener() {}
// function renderSliderValue(e) {
//   const cont = document.querySelectorAll(".slider");
//   if (!cont) return;

//   if (e.target.closest === cont &&)
// }
