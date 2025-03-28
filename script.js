/* ----- Tab Navigation ----- */
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active classes
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Activate the clicked tab and corresponding content section
    btn.classList.add('active');
    document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
  });
});

/* ----- QR Code Generator (Existing Functionality) ----- */
const container = document.querySelector(".container");
const userInput = document.getElementById("userInput");
const submitBtn = document.getElementById("submit");
const downloadBtn = document.getElementById("download");
const sizeOptions = document.querySelector(".sizeOptions");
const BGColor = document.getElementById("BGColor");
const FGColor = document.getElementById("FGColor");
let QR_Code;
let sizeChoice = 100, BGColorChoice = "#ffffff", FGColorChoice = "#9b51e0";

// Update settings on change
sizeOptions.addEventListener("change", () => {
  sizeChoice = sizeOptions.value;
});
BGColor.addEventListener("input", () => {
  BGColorChoice = BGColor.value;
});
FGColor.addEventListener("input", () => {
  FGColorChoice = FGColor.value;
});

// Simple input formatter
const inputFormatter = (value) => {
  return value.replace(/[^a-zA-Z0-9]+/g, "");
};

submitBtn.addEventListener("click", async () => {
  container.innerHTML = "";
  // Generate QR code
  QR_Code = await new QRCode(container, {
    text: userInput.value,
    width: parseInt(sizeChoice),
    height: parseInt(sizeChoice),
    colorDark: FGColorChoice,
    colorLight: BGColorChoice,
  });
  
  // Prepare download link
  const src = container.firstChild.toDataURL("image/png");
  downloadBtn.href = src;
  let userValue = userInput.value;
  try {
    userValue = new URL(userValue).hostname;
  } catch (_) {
    userValue = inputFormatter(userValue);
  }
  downloadBtn.download = `${userValue}_QR.png`;
  downloadBtn.classList.remove("hide");
  
  // Save action to history
  addToHistory(`Generated: ${userInput.value}`);
});

userInput.addEventListener("input", () => {
  if (userInput.value.trim().length < 1) {
    submitBtn.disabled = true;
    downloadBtn.href = "";
    downloadBtn.classList.add("hide");
  } else {
    submitBtn.disabled = false;
  }
});

window.onload = () => {
  container.innerHTML = "";
  sizeChoice = 100;
  sizeOptions.value = 100;
  userInput.value = "";
  BGColor.value = BGColorChoice = "#ffffff";
  FGColor.value = FGColorChoice = "#9b51e0";
  downloadBtn.classList.add("hide");
  submitBtn.disabled = true;
};

/* ----- QR Code Scanner Functionality ----- */
const video = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvas = canvasElement.getContext('2d');
const scanResult = document.getElementById('scan-result');
let scanning = false;
let videoStream = null;

// Start camera scan
document.getElementById('start-camera').addEventListener('click', () => {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      scanning = true;
      videoStream = stream;
      video.setAttribute('playsinline', true); // iOS requirement
      video.srcObject = stream;
      video.play();
      tick();
    })
    .catch(err => {
      alert("Could not access camera: " + err);
    });
});

// Stop camera scan
document.getElementById('stop-camera').addEventListener('click', () => {
  scanning = false;
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
  }
  video.srcObject = null;
  document.getElementById('stop-camera').disabled = true;
});

video.addEventListener('play', () => {
  document.getElementById('stop-camera').disabled = false;
});

// Continuously scan video frames
function tick() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvasElement.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
    let imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
    let code = jsQR(imageData.data, canvasElement.width, canvasElement.height, {
      inversionAttempts: "dontInvert",
    });
    if (code) {
      scanning = false;
      scanResult.innerText = `QR Code Data: ${code.data}`;
      addToHistory(`Scanned: ${code.data}`);
      // Stop video stream after successful scan
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      video.srcObject = null;
      return;
    } else {
      scanResult.innerText = "Scanning...";
    }
  }
  if (scanning) {
    requestAnimationFrame(tick);
  }
}

// Scan via file upload
document.getElementById('upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function() {
    let img = new Image();
    img.onload = function() {
      canvasElement.width = img.width;
      canvasElement.height = img.height;
      canvas.drawImage(img, 0, 0, img.width, img.height);
      let imageData = canvas.getImageData(0, 0, img.width, img.height);
      let code = jsQR(imageData.data, img.width, img.height, {
        inversionAttempts: "dontInvert",
      });
      if (code) {
        scanResult.innerText = `QR Code Data: ${code.data}`;
        addToHistory(`Scanned (upload): ${code.data}`);
      } else {
        scanResult.innerText = "No QR code found.";
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* ----- History Functionality ----- */
function addToHistory(entry) {
  let historyList = document.getElementById('history-list');
  let li = document.createElement('li');
  li.innerText = `${new Date().toLocaleString()} - ${entry}`;
  historyList.prepend(li);
  
  // Save history to localStorage
  let historyData = JSON.parse(localStorage.getItem('qrHistory')) || [];
  historyData.unshift({ date: new Date().toLocaleString(), entry });
  localStorage.setItem('qrHistory', JSON.stringify(historyData));
}

// Load saved history on page load
window.addEventListener('load', () => {
  let historyData = JSON.parse(localStorage.getItem('qrHistory')) || [];
  let historyList = document.getElementById('history-list');
  historyData.forEach(item => {
    let li = document.createElement('li');
    li.innerText = `${item.date} - ${item.entry}`;
    historyList.appendChild(li);
  });
});

// Clear history button
document.getElementById('clear-history').addEventListener('click', () => {
  localStorage.removeItem('qrHistory');
  document.getElementById('history-list').innerHTML = "";
});

/* ----- Settings Functionality ----- */
document.getElementById('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const defaultSize = document.getElementById('defaultSize').value;
  const defaultBG = document.getElementById('defaultBG').value;
  const defaultFG = document.getElementById('defaultFG').value;
  localStorage.setItem('defaultSize', defaultSize);
  localStorage.setItem('defaultBG', defaultBG);
  localStorage.setItem('defaultFG', defaultFG);
  alert("Settings saved!");
});

// Load settings on page load
window.addEventListener('load', () => {
  const savedSize = localStorage.getItem('defaultSize');
  const savedBG = localStorage.getItem('defaultBG');
  const savedFG = localStorage.getItem('defaultFG');
  if (savedSize) {
    sizeOptions.value = savedSize;
    sizeChoice = savedSize;
  }
  if (savedBG) {
    BGColor.value = savedBG;
    BGColorChoice = savedBG;
  }
  if (savedFG) {
    FGColor.value = savedFG;
    FGColorChoice = savedFG;
  }
});
