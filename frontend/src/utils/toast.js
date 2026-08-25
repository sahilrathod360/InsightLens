// Toast Notification & Byte Formatting Utilities

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  
  let border = 'border-slate-700/50';
  let iconColor = 'text-slate-300';
  let iconName = 'info';
  let bgGradient = 'bg-surface-container';

  if (type === 'success') {
    border = 'border-emerald-500/30';
    iconColor = 'text-emerald-400';
    iconName = 'check_circle';
    bgGradient = 'bg-surface-container-lowest';
  } else if (type === 'warning' || type === 'error') {
    border = 'border-red-500/30';
    iconColor = 'text-red-400';
    iconName = 'warning';
    bgGradient = 'bg-surface-container-lowest';
  }

  // Use the new CSS animations
  toast.className = `${bgGradient} text-on-surface px-4 py-3.5 rounded-xl border ${border} shadow-2xl text-body-sm flex items-start gap-3 animate-toast-in relative overflow-hidden backdrop-blur-md z-50 min-w-[280px]`;
  
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] ${iconColor} mt-0.5 shrink-0">
      ${iconName}
    </span>
    <span class="font-body-sm font-medium leading-relaxed pr-2">${message}</span>
    
    <!-- Progress bar at bottom -->
    <div class="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 toast-progress-bar ${iconColor}"></div>
  `;

  container.appendChild(toast);
  
  // Use animation class for exit instead of manual transitions
  setTimeout(() => {
    toast.classList.remove('animate-toast-in');
    toast.classList.add('animate-toast-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
