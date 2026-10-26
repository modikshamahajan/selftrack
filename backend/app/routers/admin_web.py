import os
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["Admin Web Portal"])

ADMIN_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SelfTrack Database & Admin Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0B0F19;
      --card-bg: rgba(22, 28, 45, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(30, 39, 63, 0.9);
      --primary: #10B981;
      --primary-glow: rgba(16, 185, 129, 0.25);
      --accent: #6366F1;
      --accent-glow: rgba(99, 102, 241, 0.25);
      --warning: #F59E0B;
      --danger: #EF4444;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 15% 15%, #131A2E 0%, var(--bg) 65%);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    /* HEADER */
    header {
      backdrop-filter: blur(16px);
      background: rgba(11, 15, 25, 0.85);
      border-bottom: 1px solid var(--card-border);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--text);
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 20px var(--primary-glow);
    }
    .brand-title {
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand-badge {
      font-size: 11px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.15);
      color: var(--primary);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 8px;
      border-radius: 20px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid var(--card-border);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 10px var(--primary);
    }
    .btn {
      background: linear-gradient(135deg, var(--primary), #059669);
      color: #FFFFFF;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: var(--font);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 10px var(--primary-glow);
    }
    .btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.1);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
      border: 1px solid var(--card-border);
      box-shadow: none;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* CONTAINER */
    .container {
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 28px;
      flex: 1;
    }

    /* TABS */
    .tabs-bar {
      display: flex;
      gap: 8px;
      background: rgba(22, 28, 45, 0.5);
      padding: 6px;
      border-radius: 12px;
      border: 1px solid var(--card-border);
      margin-bottom: 24px;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      color: var(--text-muted);
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: var(--font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .tab-btn.active {
      background: var(--card-hover);
      color: var(--text);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .tab-btn:hover:not(.active) {
      color: var(--text);
      background: rgba(255, 255, 255, 0.03);
    }

    /* STATS CARDS */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      padding: 20px;
      border-radius: 16px;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }
    .stat-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.18);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--card-accent, var(--primary)), transparent);
    }
    .stat-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -1px;
    }
    .stat-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    /* CARD WRAPPER */
    .panel {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .panel-title {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* SEARCH & FILTER */
    .search-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 9px 14px;
      border-radius: 8px;
      font-family: var(--font);
      font-size: 13px;
      outline: none;
      min-width: 240px;
      transition: all 0.2s ease;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 10px var(--primary-glow);
    }
    .select-input {
      background: rgba(22, 28, 45, 0.9);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 9px 14px;
      border-radius: 8px;
      font-family: var(--font);
      font-size: 13px;
      outline: none;
      cursor: pointer;
    }

    /* DATA TABLES */
    .table-container {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      text-align: left;
    }
    th {
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-muted);
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid var(--card-border);
      white-space: nowrap;
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    /* BADGES */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .badge-active { background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-dormant { background: rgba(148, 163, 184, 0.15); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.2); }
    .badge-platform { background: rgba(99, 102, 241, 0.15); color: #A5B4FC; border: 1px solid rgba(99, 102, 241, 0.3); }
    .badge-category { background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.3); }

    .btn-action {
      background: rgba(99, 102, 241, 0.15);
      color: #A5B4FC;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: var(--accent);
      color: #FFFFFF;
    }

    /* USER DETAIL MODAL */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 200;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-overlay.open { display: flex; }
    .modal-content {
      background: #131A2E;
      border: 1px solid var(--card-border);
      border-radius: 20px;
      max-width: 800px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--card-border);
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 24px;
      cursor: pointer;
    }

    .code-cell {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #CBD5E1;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* SPINNER */
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 0.8s linear infinite;
      margin: 30px auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    footer {
      border-top: 1px solid var(--card-border);
      padding: 16px 28px;
      text-align: center;
      font-size: 12.5px;
      color: var(--text-muted);
      margin-top: auto;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <header>
    <a href="/admin" class="brand">
      <div class="brand-logo">⚡</div>
      <div>
        <div class="brand-title">SelfTrack Admin Portal</div>
      </div>
      <div class="brand-badge">Database Telemetry</div>
    </a>
    <div class="header-actions">
      <div class="status-pill">
        <div class="status-dot"></div>
        <span>SQLite DB Live: <strong style="color:#FFF;">backend/selftrack.db</strong></span>
      </div>
      <a href="/docs" target="_blank" class="btn btn-secondary">API Docs 📖</a>
      <button class="btn" onclick="refreshCurrentTab()">🔄 Refresh</button>
    </div>
  </header>

  <div class="container">

    <!-- TABS -->
    <div class="tabs-bar">
      <button class="tab-btn active" onclick="switchTab('overview')">📊 Overview & Metrics</button>
      <button class="tab-btn" onclick="switchTab('users')">👥 Onboarded Users</button>
      <button class="tab-btn" onclick="switchTab('habits')">🌱 All User Habits</button>
      <button class="tab-btn" onclick="switchTab('food')">🥗 Food & Nutrition Logs</button>
      <button class="tab-btn" onclick="switchTab('tables')">🗄️ Raw Database Explorer</button>
    </div>

    <!-- TAB 1: OVERVIEW -->
    <div id="tab-overview" class="tab-content">
      <div class="stats-grid">
        <div class="stat-card" style="--card-accent: #10B981;">
          <div class="stat-label">👥 Total Users</div>
          <div class="stat-value" id="stat-total-users">-</div>
          <div class="stat-sub" id="stat-dau-sub">DAU: - | WAU: -</div>
        </div>
        <div class="stat-card" style="--card-accent: #6366F1;">
          <div class="stat-label">🎯 Total Habits</div>
          <div class="stat-value" id="stat-total-habits">-</div>
          <div class="stat-sub" id="stat-habits-sub">Completion Rate: -</div>
        </div>
        <div class="stat-card" style="--card-accent: #38BDF8;">
          <div class="stat-label">🩺 Health Logs</div>
          <div class="stat-value" id="stat-total-health">-</div>
          <div class="stat-sub" id="stat-health-sub">Avg Steps: -</div>
        </div>
        <div class="stat-card" style="--card-accent: #F59E0B;">
          <div class="stat-label">🥗 Food Entries</div>
          <div class="stat-value" id="stat-total-food">-</div>
          <div class="stat-sub">Meals logged by users</div>
        </div>
        <div class="stat-card" style="--card-accent: #EC4899;">
          <div class="stat-label">📖 Journal Entries</div>
          <div class="stat-value" id="stat-total-journals">-</div>
          <div class="stat-sub">Reflections written</div>
        </div>
        <div class="stat-card" style="--card-accent: #8B5CF6;">
          <div class="stat-label">📱 Platform Split</div>
          <div class="stat-value" id="stat-downloads">-</div>
          <div class="stat-sub" id="stat-platform-sub">Android: - | iOS: -</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🌱 Habit Category Distribution</div>
        </div>
        <div id="habit-categories-container" style="display:flex; gap:12px; flex-wrap:wrap;">
          Loading category distribution...
        </div>
      </div>
    </div>

    <!-- TAB 2: USERS -->
    <div id="tab-users" class="tab-content" style="display:none;">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">👥 All Onboarded Users (<span id="users-count-badge">0</span>)</div>
          <div style="display:flex; gap:10px;">
            <input type="text" id="user-search" class="search-input" placeholder="Search by name, email, or phone..." oninput="filterUsers()">
            <select id="user-status-filter" class="select-input" onchange="fetchUsers()">
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="dormant">Dormant</option>
            </select>
          </div>
        </div>
        <div class="table-container">
          <table id="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Platform</th>
                <th>Habits</th>
                <th>XP & Level</th>
                <th>Streak</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="users-tbody">
              <tr><td colspan="9"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: ALL HABITS -->
    <div id="tab-habits" class="tab-content" style="display:none;">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🎯 Every Habit Created by Users (<span id="habits-count-badge">0</span>)</div>
          <input type="text" id="habit-search" class="search-input" placeholder="Search habits..." oninput="filterHabits()">
        </div>
        <div class="table-container">
          <table id="habits-table">
            <thead>
              <tr>
                <th>Habit Name</th>
                <th>Category</th>
                <th>Owner (User)</th>
                <th>Current Streak</th>
                <th>Best Streak</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody id="habits-tbody">
              <tr><td colspan="7"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: FOOD LOGS -->
    <div id="tab-food" class="tab-content" style="display:none;">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🥗 Food & Nutrition Logs (<span id="food-count-badge">0</span>)</div>
          <input type="text" id="food-search" class="search-input" placeholder="Search food items..." oninput="filterFood()">
        </div>
        <div class="table-container">
          <table id="food-table">
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Calories</th>
                <th>Portion / Qty</th>
                <th>Category</th>
                <th>Logged By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="food-tbody">
              <tr><td colspan="6"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 5: RAW TABLES EXPLORER -->
    <div id="tab-tables" class="tab-content" style="display:none;">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🗄️ Raw Database Explorer</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <label style="font-size:13px; color:var(--text-muted);">Select Table:</label>
            <select id="raw-table-select" class="select-input" onchange="loadRawTable()">
              <option value="users">users</option>
              <option value="habits">habits</option>
              <option value="habit_logs">habit_logs</option>
              <option value="health_metrics">health_metrics</option>
              <option value="food_logs">food_logs</option>
              <option value="journal_entries">journal_entries</option>
              <option value="admins">admins</option>
              <option value="app_downloads">app_downloads</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:12px; font-size:12.5px; color:var(--text-muted);" id="raw-table-meta">
          Showing table records...
        </div>
        <div class="table-container">
          <table id="raw-data-table">
            <thead id="raw-table-thead"></thead>
            <tbody id="raw-table-tbody">
              <tr><td><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>

  <!-- USER DETAIL MODAL -->
  <div id="user-modal" class="modal-overlay" onclick="closeUserModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="modal-user-name" style="font-size:20px; font-weight:800;">User Details</h3>
        <button class="close-btn" onclick="closeUserModal()">&times;</button>
      </div>
      <div id="modal-body">
        <div class="spinner"></div>
      </div>
    </div>
  </div>

  <footer>
    SelfTrack Database Portal &bull; FastAPI Backend &bull; SQLite selftrack.db &bull; Port 5000
  </footer>

  <script>
    let adminToken = '';
    let currentTab = 'overview';
    let cachedUsers = [];
    let cachedHabits = [];
    let cachedFood = [];

    // Auto-login admin on load
    async function initAuth() {
      try {
        const res = await fetch('/api/v1/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@selftrack.com', password: 'admin123' })
        });
        const data = await res.json();
        if (data.access_token) {
          adminToken = data.access_token;
          loadDashboard();
        }
      } catch (e) {
        console.error('Failed admin auth:', e);
      }
    }

    function authHeaders() {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      };
    }

    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      document.getElementById(`tab-${tab}`).style.display = 'block';

      if (tab === 'overview') loadDashboard();
      if (tab === 'users') fetchUsers();
      if (tab === 'habits') fetchHabits();
      if (tab === 'food') fetchFood();
      if (tab === 'tables') loadRawTable();
    }

    function refreshCurrentTab() {
      if (currentTab === 'overview') loadDashboard();
      if (currentTab === 'users') fetchUsers();
      if (currentTab === 'habits') fetchHabits();
      if (currentTab === 'food') fetchFood();
      if (currentTab === 'tables') loadRawTable();
    }

    // LOAD OVERVIEW METRICS
    async function loadDashboard() {
      try {
        const res = await fetch('/api/v1/admin/dashboard', { headers: authHeaders() });
        const d = await res.json();
        document.getElementById('stat-total-users').innerText = d.total_users || 0;
        document.getElementById('stat-dau-sub').innerText = `DAU: ${d.active_users?.dau || 0} | WAU: ${d.active_users?.wau || 0}`;
        document.getElementById('stat-total-habits').innerText = d.total_habits || 0;
        document.getElementById('stat-habits-sub').innerText = `Completion Rate: ${d.habit_analytics?.global_completion_rate || 0}%`;
        document.getElementById('stat-total-health').innerText = d.total_health_metrics || 0;
        document.getElementById('stat-health-sub').innerText = `Avg Steps: ${(d.health_analytics?.avg_steps || 0).toLocaleString()}`;
        document.getElementById('stat-total-food').innerText = d.health_analytics?.total_food_logs || 0;
        document.getElementById('stat-total-journals').innerText = d.total_journal_entries || 0;
        
        const dl = d.downloads_by_platform || {};
        document.getElementById('stat-downloads').innerText = `${dl.total_downloads || 0} Downloads`;
        document.getElementById('stat-platform-sub').innerText = `Android: ${dl.android_count || 0} | iOS: ${dl.ios_count || 0}`;

        // Render category distribution
        const catBox = document.getElementById('habit-categories-container');
        const cats = d.habit_analytics?.category_distribution || {};
        catBox.innerHTML = '';
        Object.entries(cats).forEach(([cat, count]) => {
          const pill = document.createElement('div');
          pill.className = 'badge badge-category';
          pill.style.padding = '8px 16px';
          pill.style.fontSize = '13px';
          pill.innerHTML = `<strong>${cat}:</strong>&nbsp;${count} habits`;
          catBox.appendChild(pill);
        });
      } catch (e) {
        console.error(e);
      }
    }

    // FETCH USERS
    async function fetchUsers() {
      const tbody = document.getElementById('users-tbody');
      tbody.innerHTML = '<tr><td colspan="9"><div class="spinner"></div></td></tr>';
      try {
        const filter = document.getElementById('user-status-filter').value;
        const res = await fetch(`/api/v1/admin/users?status_filter=${filter}`, { headers: authHeaders() });
        cachedUsers = await res.json();
        document.getElementById('users-count-badge').innerText = cachedUsers.length;
        renderUsers(cachedUsers);
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="9" style="color:#EF4444;">Failed to load users</td></tr>';
      }
    }

    function renderUsers(list) {
      const tbody = document.getElementById('users-tbody');
      tbody.innerHTML = '';
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#94A3B8;">No users found</td></tr>';
        return;
      }
      list.forEach(u => {
        const tr = document.createElement('tr');
        const isAct = u.status?.includes('Active');
        tr.innerHTML = `
          <td><strong>${escapeHtml(u.name || 'Anonymous')}</strong><div class="code-cell">${u.id}</div></td>
          <td>${escapeHtml(u.email || u.phone || '-')}</td>
          <td><span class="badge badge-platform">${escapeHtml(u.platform || 'app')}</span></td>
          <td><strong style="color:#10B981;">${u.habits_count || 0}</strong> habits</td>
          <td>${u.total_xp || 0} XP (Lvl ${u.level || 1})</td>
          <td>🔥 ${u.streak_count || 0}d</td>
          <td><span class="badge ${isAct ? 'badge-active' : 'badge-dormant'}">${u.status}</span></td>
          <td style="color:#94A3B8; font-size:12px;">${formatDate(u.created_at)}</td>
          <td><button class="btn-action" onclick="inspectUser('${u.id}')">Inspect 🔍</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function filterUsers() {
      const q = document.getElementById('user-search').value.toLowerCase();
      const filtered = cachedUsers.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
      );
      renderUsers(filtered);
    }

    // INSPECT SINGLE USER
    async function inspectUser(userId) {
      document.getElementById('user-modal').classList.add('open');
      const body = document.getElementById('modal-body');
      body.innerHTML = '<div class="spinner"></div>';
      try {
        const res = await fetch(`/api/v1/admin/users/${userId}`, { headers: authHeaders() });
        const u = await res.json();
        document.getElementById('modal-user-name').innerText = `${u.name || 'User'} (${u.email || u.phone || u.id})`;

        let habitsHtml = u.habits && u.habits.length > 0 
          ? u.habits.map(h => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 14px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong>${escapeHtml(h.name)}</strong>
                <span class="badge badge-category" style="margin-left:8px;">${escapeHtml(h.category || 'General')}</span>
              </div>
              <div style="font-size:12.5px; color:#94A3B8;">
                Current: <strong>${h.current_streak}d</strong> | Best: <strong>${h.best_streak}d</strong>
              </div>
            </div>
          `).join('')
          : '<div style="color:#94A3B8;">No habits added yet.</div>';

        let healthHtml = u.recent_health_metrics && u.recent_health_metrics.length > 0
          ? u.recent_health_metrics.map(hm => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:8px; margin-bottom:6px; display:flex; justify-content:space-between; font-size:12.5px;">
              <span><strong>📅 ${hm.date}</strong></span>
              <span>👟 <strong>${(hm.steps || 0).toLocaleString()}</strong> steps</span>
              <span>💧 <strong>${hm.water_glasses || 0}</strong> glasses</span>
              <span>🌙 <strong>${hm.sleep_hours || 0}</strong>h sleep</span>
              <span>🔥 <strong>${hm.calories_burned || 0}</strong> kcal</span>
            </div>
          `).join('')
          : '<div style="color:#94A3B8;">No health logs yet.</div>';

        body.innerHTML = `
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
            <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:10px;">
              <div style="font-size:11px; color:#94A3B8;">TOTAL XP</div>
              <div style="font-size:20px; font-weight:800; color:#10B981;">${u.total_xp || 0}</div>
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:10px;">
              <div style="font-size:11px; color:#94A3B8;">CURRENT STREAK</div>
              <div style="font-size:20px; font-weight:800; color:#F59E0B;">🔥 ${u.streak_count || 0} Days</div>
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:10px;">
              <div style="font-size:11px; color:#94A3B8;">JOURNAL ENTRIES</div>
              <div style="font-size:20px; font-weight:800; color:#38BDF8;">📝 ${u.journal_count || 0} Entries</div>
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:10px;">
              <div style="font-size:11px; color:#94A3B8;">PLATFORM</div>
              <div style="font-size:20px; font-weight:800; color:#A5B4FC;">${escapeHtml(u.platform || 'app')}</div>
            </div>
          </div>

          <h4 style="margin:16px 0 10px; font-size:15px; color:#FFF;">🎯 User's Added Habits (${u.habits?.length || 0})</h4>
          ${habitsHtml}

          <h4 style="margin:20px 0 10px; font-size:15px; color:#FFF;">🩺 Health & Vital Logs</h4>
          ${healthHtml}
        `;
      } catch (e) {
        body.innerHTML = '<div style="color:#EF4444;">Failed to load user profile</div>';
      }
    }

    function closeUserModal(e) {
      document.getElementById('user-modal').classList.remove('open');
    }

    // ALL HABITS
    async function fetchHabits() {
      const tbody = document.getElementById('habits-tbody');
      tbody.innerHTML = '<tr><td colspan="7"><div class="spinner"></div></td></tr>';
      try {
        const res = await fetch('/api/v1/admin/all-habits', { headers: authHeaders() });
        cachedHabits = await res.json();
        document.getElementById('habits-count-badge').innerText = cachedHabits.length;
        renderHabits(cachedHabits);
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="color:#EF4444;">Failed to load habits</td></tr>';
      }
    }

    function renderHabits(list) {
      const tbody = document.getElementById('habits-tbody');
      tbody.innerHTML = '';
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94A3B8;">No habits in database</td></tr>';
        return;
      }
      list.forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(h.name)}</strong></td>
          <td><span class="badge badge-category">${escapeHtml(h.category || 'General')}</span></td>
          <td><strong>${escapeHtml(h.user_name || 'User')}</strong><div class="code-cell">${h.user_email || h.user_id}</div></td>
          <td>🔥 ${h.current_streak || 0}d</td>
          <td>🏆 ${h.best_streak || 0}d</td>
          <td><span class="badge ${h.is_archived ? 'badge-dormant' : 'badge-active'}">${h.is_archived ? 'Archived' : 'Active'}</span></td>
          <td style="color:#94A3B8; font-size:12px;">${formatDate(h.created_at)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function filterHabits() {
      const q = document.getElementById('habit-search').value.toLowerCase();
      const filtered = cachedHabits.filter(h => 
        (h.name && h.name.toLowerCase().includes(q)) ||
        (h.category && h.category.toLowerCase().includes(q)) ||
        (h.user_name && h.user_name.toLowerCase().includes(q)) ||
        (h.user_email && h.user_email.toLowerCase().includes(q))
      );
      renderHabits(filtered);
    }

    // ALL FOOD LOGS
    async function fetchFood() {
      const tbody = document.getElementById('food-tbody');
      tbody.innerHTML = '<tr><td colspan="6"><div class="spinner"></div></td></tr>';
      try {
        const res = await fetch('/api/v1/admin/all-food-logs', { headers: authHeaders() });
        cachedFood = await res.json();
        document.getElementById('food-count-badge').innerText = cachedFood.length;
        renderFood(cachedFood);
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#EF4444;">Failed to load food logs</td></tr>';
      }
    }

    function renderFood(list) {
      const tbody = document.getElementById('food-tbody');
      tbody.innerHTML = '';
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94A3B8;">No food logs recorded</td></tr>';
        return;
      }
      list.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(f.name)}</strong></td>
          <td><strong style="color:#F59E0B;">${f.calories || 0} kcal</strong></td>
          <td>${f.qty || 1} (${escapeHtml(f.serving || '1 portion')})</td>
          <td><span class="badge badge-category">${escapeHtml(f.category || 'Food')}</span></td>
          <td><strong>${escapeHtml(f.user_name || 'User')}</strong><div class="code-cell">${f.user_email || f.user_id}</div></td>
          <td style="color:#94A3B8; font-size:12px;">${f.date || '-'}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function filterFood() {
      const q = document.getElementById('food-search').value.toLowerCase();
      const filtered = cachedFood.filter(f => 
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.user_name && f.user_name.toLowerCase().includes(q))
      );
      renderFood(filtered);
    }

    // RAW DATABASE TABLES EXPLORER
    async function loadRawTable() {
      const table = document.getElementById('raw-table-select').value;
      const thead = document.getElementById('raw-table-thead');
      const tbody = document.getElementById('raw-table-tbody');
      const meta = document.getElementById('raw-table-meta');

      meta.innerText = `Loading table '${table}'...`;
      tbody.innerHTML = '<tr><td><div class="spinner"></div></td></tr>';

      try {
        const res = await fetch(`/api/v1/admin/table-records?table=${table}&limit=100`, { headers: authHeaders() });
        const d = await res.json();

        meta.innerHTML = `Table: <strong style="color:#FFF;">${d.table}</strong> &bull; Total Rows in SQLite: <strong style="color:#10B981;">${d.total_records}</strong> (Displaying up to 100 rows)`;

        // Build header
        thead.innerHTML = `<tr>${d.columns.map(c => `<th>${c}</th>`).join('')}</tr>`;

        // Build rows
        if (!d.records || d.records.length === 0) {
          tbody.innerHTML = `<tr><td colspan="${d.columns.length}" style="text-align:center; color:#94A3B8;">Table is empty</td></tr>`;
          return;
        }

        tbody.innerHTML = d.records.map(r => `
          <tr>
            ${d.columns.map(col => {
              const val = r[col];
              if (val === null || val === undefined) return '<td style="color:#64748B;">NULL</td>';
              if (typeof val === 'boolean') return `<td><span class="badge ${val ? 'badge-active' : 'badge-dormant'}">${val}</span></td>`;
              return `<td class="code-cell" title="${escapeHtml(String(val))}">${escapeHtml(String(val))}</td>`;
            }).join('')}
          </tr>
        `).join('');

      } catch (e) {
        tbody.innerHTML = `<tr><td style="color:#EF4444;">Failed to load table ${table}</td></tr>`;
      }
    }

    function formatDate(dt) {
      if (!dt) return '-';
      try {
        const d = new Date(dt);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return dt;
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Start
    initAuth();
  </script>
</body>
</html>
"""

@router.get("/admin", response_class=HTMLResponse)
@router.get("/admin/", response_class=HTMLResponse)
@router.get("/dashboard", response_class=HTMLResponse)
async def admin_portal_page():
    """Serves the SelfTrack Interactive Web Admin & Database Portal."""
    return HTMLResponse(content=ADMIN_HTML)
