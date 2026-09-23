export function showDialog(options: {
  message: string;
  type: "alert" | "confirm";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  const overlay = document.getElementById("customDialogOverlay");
  const messageEl = document.getElementById("customDialogMessage");
  const confirmBtn = document.getElementById("customDialogConfirmBtn");
  const cancelBtn = document.getElementById("customDialogCancelBtn");

  if (!overlay || !messageEl || !confirmBtn || !cancelBtn) return;

  messageEl.textContent = options.message;

  const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLButtonElement;
  const newCancelBtn = cancelBtn.cloneNode(true) as HTMLButtonElement;
  confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);

  newConfirmBtn.textContent = options.confirmText || "OK";

  if (options.type === "alert") {
    newCancelBtn.style.display = "none";
  } else {
    newCancelBtn.style.display = "block";
    newCancelBtn.textContent = options.cancelText || "Bekor qilish";
  }

  const closeOverlay = () => {
    overlay.classList.remove("open");
  };

  newConfirmBtn.addEventListener("click", () => {
    closeOverlay();
    if (options.onConfirm) options.onConfirm();
  });

  newCancelBtn.addEventListener("click", () => {
    closeOverlay();
    if (options.onCancel) options.onCancel();
  });

  overlay.classList.add("open");
}

// PIN tasdiqlash modal — maxfiy amal bajarishdan oldin
export function showPinConfirm(options: {
  message: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  // Mavjud overlay va PIN overlay yaratamiz
  let pinOverlay = document.getElementById("pinConfirmOverlay");
  if (!pinOverlay) {
    pinOverlay = document.createElement("div");
    pinOverlay.id = "pinConfirmOverlay";
    pinOverlay.className = "modal-overlay";
    pinOverlay.innerHTML = `
      <div class="modal-box">
        <h3 id="pinConfirmMessage" style="margin-bottom:20px;font-size:16px;line-height:1.4"></h3>
        <p style="font-size:13px;color:var(--text-dim);margin-bottom:16px;">Tasdiqlash uchun PIN kodingizni kiriting:</p>
        <input
          id="pinConfirmInput"
          type="password"
          inputmode="numeric"
          maxlength="4"
          placeholder="••••"
          style="text-align:center;font-size:28px;letter-spacing:10px;margin-bottom:8px;"
          class="input"
        />
        <div id="pinConfirmError" style="color:var(--red-occ);font-size:13px;min-height:20px;margin-bottom:8px;text-align:center"></div>
        <div class="dialog-actions">
          <button class="btn btn-danger" id="pinConfirmOkBtn">Tasdiqlash</button>
          <button class="btn btn-secondary" id="pinConfirmCancelBtn">Bekor qilish</button>
        </div>
      </div>
    `;
    document.body.appendChild(pinOverlay);
  }

  const messageEl = document.getElementById("pinConfirmMessage")!;
  const input = document.getElementById("pinConfirmInput") as HTMLInputElement;
  const errorEl = document.getElementById("pinConfirmError")!;
  const okBtn = document.getElementById("pinConfirmOkBtn")!.cloneNode(true) as HTMLButtonElement;
  const cancelBtn = document.getElementById("pinConfirmCancelBtn")!.cloneNode(true) as HTMLButtonElement;
  document.getElementById("pinConfirmOkBtn")!.replaceWith(okBtn);
  document.getElementById("pinConfirmCancelBtn")!.replaceWith(cancelBtn);

  messageEl.textContent = options.message;
  input.value = "";
  errorEl.textContent = "";

  const close = () => {
    pinOverlay!.classList.remove("open");
    input.value = "";
    errorEl.textContent = "";
  };

  const verify = () => {
    const pin = input.value.trim();
    if (pin.length !== 4) {
      errorEl.textContent = "PIN kod 4 xonali bo'lishi kerak!";
      input.focus();
      return;
    }
    const phone = localStorage.getItem("currentUser") || "";
    const savedPin = localStorage.getItem("offline_pin_" + phone);
    if (savedPin && atob(savedPin) === pin) {
      close();
      options.onSuccess();
    } else {
      errorEl.textContent = "PIN kod noto'g'ri!";
      input.value = "";
      input.focus();
    }
  };

  okBtn.addEventListener("click", verify);
  cancelBtn.addEventListener("click", () => {
    close();
    if (options.onCancel) options.onCancel();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") verify();
  });

  pinOverlay.classList.add("open");
  setTimeout(() => input.focus(), 100);
}
