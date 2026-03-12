const currentUrl = window.location.href;
const uatSub = "uatnew-www.";
const prodSub = "www.";
let newUrl;

if (currentUrl.includes(uatSub)) {
  newUrl = currentUrl.replace(uatSub, prodSub);
} else {
  newUrl = currentUrl.replace(prodSub, uatSub);
}

window.location.href = newUrl;
