function test() {
  for (let i = 0; i < 5; i++) {
    const div = document.createElement("div");
    div.textContent = "im number " + i;
    document.querySelector(".cont").append(div);
  }
}
test();
