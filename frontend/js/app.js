const API_URL = '/api';

// ── Theme Management ─────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('emr-theme', theme);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark'
      ? `<span>☀️</span><span class="theme-label">Light Mode</span>`
      : `<span>🌙</span><span class="theme-label">Dark Mode</span>`;
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── Sidebar Collapse (Desktop) ────────────────────────────────
function applySidebarState(collapsed) {
  if (collapsed) {
    document.body.classList.add('sidebar-collapsed');
    localStorage.setItem('emr-sidebar', 'collapsed');
  } else {
    document.body.classList.remove('sidebar-collapsed');
    localStorage.setItem('emr-sidebar', 'open');
  }
}

function toggleDesktopSidebar() {
  const isCollapsed = document.body.classList.contains('sidebar-collapsed');
  applySidebarState(!isCollapsed);
}

// ── Notification Banner ─────────────────────────────────────
function showNotification(message, isError = false) {
  let banner = document.getElementById('status-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'status-banner';
    document.body.appendChild(banner);
  }
  banner.textContent = message;
  banner.className = `banner ${isError ? 'error' : 'success'} show`;
  setTimeout(() => banner.classList.remove('show'), 4000);
}

// ── Sidebar Toggle (Mobile) ───────────────────────────────────
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    // On mobile: slide-in drawer
    const sidebar  = document.querySelector('.sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  } else {
    // On desktop: collapse/expand
    toggleDesktopSidebar();
  }
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar)  sidebar.classList.remove('open');
  if (overlay)  overlay.classList.remove('show');
}

// ── Inject Topbar Controls ────────────────────────────────────
function injectTopbarControls() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;

  // Ensure topbar-right wrapper exists
  let rightEl = topbar.querySelector('.topbar-right');
  if (!rightEl) {
    rightEl = document.createElement('div');
    rightEl.className = 'topbar-right';
    const badge = topbar.querySelector('.topbar-role-badge');
    if (badge) topbar.insertBefore(rightEl, badge);
    else topbar.appendChild(rightEl);
    if (badge) rightEl.appendChild(badge);
  }

  // Inject theme toggle if not already there
  if (!document.getElementById('theme-toggle-btn')) {
    const savedTheme = localStorage.getItem('emr-theme') || 'light';
    const isDark = savedTheme === 'dark';
    const themeBtn = document.createElement('button');
    themeBtn.id        = 'theme-toggle-btn';
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    themeBtn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    themeBtn.innerHTML = isDark
      ? `<span>☀️</span><span class="theme-label">Light</span>`
      : `<span>🌙</span><span class="theme-label">Dark</span>`;
    themeBtn.onclick = toggleTheme;
    rightEl.insertBefore(themeBtn, rightEl.firstChild);
  }
}

// ── DOMContentLoaded Bootstrap ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore theme
  const savedTheme = localStorage.getItem('emr-theme') || 'light';
  applyTheme(savedTheme);

  // Restore sidebar state (desktop only)
  if (window.innerWidth > 768) {
    const savedSidebar = localStorage.getItem('emr-sidebar') || 'open';
    applySidebarState(savedSidebar === 'collapsed');
  }

  // Inject topbar controls
  injectTopbarControls();

  // Close sidebar when clicking a nav link on mobile
  document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  // Re-check layout on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      // Make sure drawer is closed cleanly
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
      // Restore saved desktop state
      const savedSidebar = localStorage.getItem('emr-sidebar') || 'open';
      applySidebarState(savedSidebar === 'collapsed');
    } else {
      // On mobile — remove desktop collapsed state
      document.body.classList.remove('sidebar-collapsed');
    }
  });
});

// ── Auth Guard ────────────────────────────────────────────────
async function checkAuth(allowedRoles = []) {
  try {
    const res = await fetch(`${API_URL}/auth/me`);
    if (!res.ok) {
      const path = window.location.pathname;
      if (!path.endsWith('login.html') && !path.endsWith('register.html')) {
        window.location.href = 'login.html';
      }
      return null;
    }
    const data = await res.json();
    const user = data.user;

    // Inject sidebar user info
    const nameEl = document.querySelector('.user-badge .user-name');
    const roleEl = document.querySelector('.user-badge .user-role');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;

    // Update topbar role badge
    const roleBadge = document.querySelector('.topbar-role-badge');
    if (roleBadge) roleBadge.textContent = user.role;

    // Redirect if wrong role
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      if (user.role === 'Admin')        window.location.href = 'index.html';
      else if (user.role === 'Doctor')  window.location.href = 'doctor.html';
      else if (user.role === 'Patient') window.location.href = 'patient.html';
    }
    return user;
  } catch (err) {
    const path = window.location.pathname;
    if (!path.endsWith('login.html') && !path.endsWith('register.html')) {
      window.location.href = 'login.html';
    }
    return null;
  }
}

// ── Logout ────────────────────────────────────────────────────
async function logout() {
  try {
    const res = await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
    if (res.ok) {
      window.location.href = 'login.html';
    } else {
      showNotification('Logout failed.', true);
    }
  } catch (err) {
    showNotification(err.message, true);
  }
}