export function showDialog(options: {
  message: string;
  type: 'alert' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  const overlay = document.getElementById('customDialogOverlay');
  const messageEl = document.getElementById('customDialogMessage');
  const confirmBtn = document.getElementById('customDialogConfirmBtn');
  const cancelBtn = document.getElementById('customDialogCancelBtn');

  if (!overlay || !messageEl || !confirmBtn || !cancelBtn) return;

  messageEl.textContent = options.message;

  const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLButtonElement;
  const newCancelBtn = cancelBtn.cloneNode(true) as HTMLButtonElement;
  confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);

  newConfirmBtn.textContent = options.confirmText || 'OK';
  
  if (options.type === 'alert') {
    newCancelBtn.style.display = 'none';
  } else {
    newCancelBtn.style.display = 'block';
    newCancelBtn.textContent = options.cancelText || 'Bekor qilish';
  }

  const closeOverlay = () => {
    overlay.classList.remove('open');
  };

  newConfirmBtn.addEventListener('click', () => {
    closeOverlay();
    if (options.onConfirm) options.onConfirm();
  });

  newCancelBtn.addEventListener('click', () => {
    closeOverlay();
    if (options.onCancel) options.onCancel();
  });

  overlay.classList.add('open');
}
