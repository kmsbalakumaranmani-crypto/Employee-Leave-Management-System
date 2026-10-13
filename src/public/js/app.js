// Take Leave - Complete Role-Based Portals & Reliable Tab Switching Logic

const STATE = {
  currentRole: 'employee', // 'employee' | 'manager' | 'admin'
  currentTab: 'overview',
  token: localStorage.getItem('leaveops_token') || null,
  user: JSON.parse(localStorage.getItem('leaveops_user') || 'null'),
  myLeavesCache: [],
  leaveTypesCache: []
};

// API Client Helper
async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (STATE.token) {
    headers['Authorization'] = `Bearer ${STATE.token}`;
  }

  try {
    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `API Error: ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`Request to ${endpoint} failed:`, err);
    throw err;
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal Handlers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// =========================================================================
// PORTAL & TAB NAVIGATION (CORE SYSTEM)
// =========================================================================

// 1. Employee Tab Switcher
function switchEmpTab(tab) {
  STATE.currentTab = tab;

  // Update tabs active state
  document.querySelectorAll('#nav-employee-tabs .nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === `emp-${tab}`);
  });

  // Hide all employee tab panes and show targeted pane
  document.querySelectorAll('#portal-employee .tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(`pane-emp-${tab}`);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  // Load tab-specific data
  if (tab === 'overview') loadEmployeeOverview();
  else if (tab === 'leaves') loadEmployeeLeaves();
  else if (tab === 'apply') prepareApplyForm();
  else if (tab === 'quotas') loadEmployeeQuotasTable();
}

// 2. Manager Tab Switcher
function switchMgrTab(tab) {
  STATE.currentTab = tab;

  document.querySelectorAll('#nav-manager-tabs .nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === `mgr-${tab}`);
  });

  document.querySelectorAll('#portal-manager .tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(`pane-mgr-${tab}`);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  loadManagerData();
}

// 3. Admin Tab Switcher
function switchAdmTab(tab) {
  STATE.currentTab = tab;

  document.querySelectorAll('#nav-admin-tabs .nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === `adm-${tab}`);
  });

  document.querySelectorAll('#portal-admin .tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(`pane-adm-${tab}`);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  loadAdminData();
}

// 4. Role Navigation (Switches Entire Portal Container)
function navigateRole(role, defaultTab = '') {
  STATE.currentRole = role;

  // Hide all portals
  document.getElementById('portal-employee').style.display = 'none';
  document.getElementById('portal-manager').style.display = 'none';
  document.getElementById('portal-admin').style.display = 'none';

  // Hide all nav groups
  document.getElementById('nav-employee-tabs').style.display = 'none';
  document.getElementById('nav-manager-tabs').style.display = 'none';
  document.getElementById('nav-admin-tabs').style.display = 'none';

  const badge = document.getElementById('current-portal-badge');
  const staffBtn = document.getElementById('btn-open-staff-auth');
  const returnBtn = document.getElementById('btn-return-employee');
  const chipRole = document.getElementById('user-chip-role');
  const chipName = document.getElementById('user-chip-name');
  const chipAvatar = document.getElementById('user-chip-avatar');

  if (role === 'manager') {
    document.getElementById('portal-manager').style.display = 'block';
    document.getElementById('nav-manager-tabs').style.display = 'flex';
    badge.textContent = '👩‍💼 HR Manager Portal';
    badge.style.color = '#6366f1';
    staffBtn.style.display = 'none';
    returnBtn.style.display = 'inline-flex';

    chipName.textContent = 'Sarah Connor';
    chipRole.textContent = 'HR MANAGER';
    chipAvatar.textContent = 'SC';

    switchMgrTab(defaultTab || 'approvals');
  } else if (role === 'admin') {
    document.getElementById('portal-admin').style.display = 'block';
    document.getElementById('nav-admin-tabs').style.display = 'flex';
    badge.textContent = '🛠️ DevOps Admin Console';
    badge.style.color = '#0284c7';
    staffBtn.style.display = 'none';
    returnBtn.style.display = 'inline-flex';

    chipName.textContent = 'DevOps Admin';
    chipRole.textContent = 'ADMIN';
    chipAvatar.textContent = 'DA';

    switchAdmTab(defaultTab || 'pipeline');
  } else {
    // Default: Employee Portal
    document.getElementById('portal-employee').style.display = 'block';
    document.getElementById('nav-employee-tabs').style.display = 'flex';
    badge.textContent = '👤 Employee Portal';
    badge.style.color = '#0d9488';
    staffBtn.style.display = 'inline-flex';
    returnBtn.style.display = 'none';

    chipName.textContent = (STATE.user && STATE.user.role === 'employee') ? STATE.user.name : 'John Doe';
    chipRole.textContent = 'EMPLOYEE';
    chipAvatar.textContent = 'JD';

    switchEmpTab(defaultTab || 'overview');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function returnToEmployeePortal() {
  loginAsDefaultEmployee().then(() => {
    navigateRole('employee', 'overview');
    showToast('Switched back to Employee Portal.', 'info');
  });
}

// =========================================================================
// STAFF & ADMIN PASSWORD AUTHENTICATION MODAL
// =========================================================================

function openStaffAuthModal() {
  document.getElementById('staff-password').value = '';
  handleStaffRoleChange();
  openModal('modal-staff-auth');
}

function handleStaffRoleChange() {
  const role = document.getElementById('staff-role-select').value;
  const emailInput = document.getElementById('staff-email');
  if (role === 'admin') {
    emailInput.value = 'admin@company.com';
  } else {
    emailInput.value = 'manager@company.com';
  }
}

async function handleStaffAuth(e) {
  e.preventDefault();
  const email = document.getElementById('staff-email').value;
  const password = document.getElementById('staff-password').value;
  const role = document.getElementById('staff-role-select').value;

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    STATE.token = data.token;
    STATE.user = data.user;
    localStorage.setItem('leaveops_token', data.token);
    localStorage.setItem('leaveops_user', JSON.stringify(data.user));

    closeModal('modal-staff-auth');
    showToast(`Access granted! Welcome, ${data.user.name}`, 'success');

    // Switch directly into the authenticated portal
    navigateRole(role);
  } catch (err) {
    showToast('Authentication failed: ' + (err.message || 'Invalid password! Access denied.'), 'error');
  }
}

// =========================================================================
// EMPLOYEE PORTAL DATA & LOGIC
// =========================================================================

async function loadEmployeeOverview() {
  if (!STATE.token) return;

  try {
    const statsRes = await api('/api/stats/overview');
    const counts = statsRes.stats.counts;

    document.getElementById('emp-stat-pending').textContent = counts.PENDING || 0;
    document.getElementById('emp-stat-approved').textContent = counts.APPROVED || 0;
    document.getElementById('emp-stat-rejected').textContent = counts.REJECTED || 0;
    document.getElementById('emp-stat-total').textContent = counts.TOTAL || 0;

    // Load Quota Meters
    const balRes = await api('/api/leaves/balance');
    renderEmployeeQuotaMeters(balRes.balances);

    // Hero quota indicator
    if (balRes.balances && balRes.balances[0]) {
      const heroQuota = document.getElementById('hero-quota-num');
      if (heroQuota) heroQuota.textContent = balRes.balances[0].remaining_days;
    }

    // Recent Requests
    const leavesRes = await api('/api/leaves');
    STATE.myLeavesCache = leavesRes.leaves;
    renderEmployeeRecentList(leavesRes.leaves.slice(0, 4));
  } catch (err) {
    console.error('Error loading employee overview:', err);
  }
}

function renderEmployeeQuotaMeters(balances) {
  const container = document.getElementById('emp-quota-meters');
  if (!container) return;

  if (!balances || balances.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No leave quotas found.</div>';
    return;
  }

  container.innerHTML = balances.map(b => {
    const pct = b.total_days > 0 ? Math.round((b.remaining_days / b.total_days) * 100) : 0;
    return `
      <div class="balance-item">
        <div class="balance-meta">
          <span class="balance-name">${b.type_name}</span>
          <span class="balance-numbers">${b.remaining_days} left / ${b.total_days} days</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderEmployeeRecentList(leaves) {
  const container = document.getElementById('emp-recent-list');
  if (!container) return;

  if (!leaves || leaves.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No recent submissions found.</div>';
    return;
  }

  container.innerHTML = leaves.map(l => `
    <div class="recent-item">
      <div>
        <div class="recent-title">${l.leave_type} (${l.days_requested}d)</div>
        <div class="recent-dates">${l.from_date} to ${l.to_date}</div>
      </div>
      <span class="badge-status ${l.status}">${l.status}</span>
    </div>
  `).join('');
}

async function loadEmployeeLeaves() {
  if (!STATE.token) return;

  try {
    const res = await api('/api/leaves');
    STATE.myLeavesCache = res.leaves;
    renderEmployeeLeavesTable(res.leaves);
  } catch (err) {
    showToast('Failed to load leaves: ' + err.message, 'error');
  }
}

function renderEmployeeLeavesTable(leaves) {
  const tbody = document.getElementById('tbody-emp-leaves');
  if (!tbody) return;

  if (leaves.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">No leave requests found.</td></tr>`;
    return;
  }

  tbody.innerHTML = leaves.map(l => `
    <tr>
      <td><code>#${l.leave_id}</code></td>
      <td><strong>${l.leave_type}</strong></td>
      <td>${l.from_date} → ${l.to_date}</td>
      <td><strong>${l.days_requested}</strong></td>
      <td title="${l.reason}">${l.reason.length > 35 ? l.reason.substring(0, 35) + '...' : l.reason}</td>
      <td><span class="badge-status ${l.status}">${l.status}</span></td>
      <td><small style="color: var(--text-muted);">${l.manager_remarks || '—'}</small></td>
      <td>
        ${l.status === 'PENDING' ? `
          <button type="button" class="btn-table-action delete" onclick="cancelEmployeeLeave(${l.leave_id})">Cancel</button>
        ` : `
          <span style="color: var(--text-light); font-size: 12px;">Processed</span>
        `}
      </td>
    </tr>
  `).join('');
}

function filterEmpLeaves(status, btn) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (status === 'ALL') {
    renderEmployeeLeavesTable(STATE.myLeavesCache);
  } else {
    const filtered = STATE.myLeavesCache.filter(l => l.status === status);
    renderEmployeeLeavesTable(filtered);
  }
}

function searchEmpLeaves() {
  const query = document.getElementById('input-search-emp-leaves').value.toLowerCase();
  const filtered = STATE.myLeavesCache.filter(l =>
    l.reason.toLowerCase().includes(query) ||
    l.leave_type.toLowerCase().includes(query)
  );
  renderEmployeeLeavesTable(filtered);
}

async function cancelEmployeeLeave(leaveId) {
  if (!confirm('Are you sure you want to cancel this pending leave request?')) return;
  try {
    await api(`/api/leaves/${leaveId}`, { method: 'DELETE' });
    showToast('Leave request cancelled.', 'success');
    loadEmployeeLeaves();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function prepareApplyForm() {
  try {
    const res = await api('/api/leave-types');
    STATE.leaveTypesCache = res.leaveTypes;

    const select = document.getElementById('form-leave-type');
    select.innerHTML = res.leaveTypes.map(lt => `
      <option value="${lt.leave_type_id}">${lt.type_name} (${lt.available_days} days/year)</option>
    `).join('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    document.getElementById('form-from-date').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('form-to-date').value = dayAfter.toISOString().split('T')[0];

    calculateEmpFormDays();
  } catch (err) {
    showToast('Failed to load leave categories: ' + err.message, 'error');
  }
}

function calculateEmpFormDays() {
  const from = document.getElementById('form-from-date').value;
  const to = document.getElementById('form-to-date').value;
  if (!from || !to) return;

  const d1 = new Date(from);
  const d2 = new Date(to);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const el = document.getElementById('form-calculated-days');
  if (el) el.textContent = diffDays > 0 ? diffDays : 0;
}

async function handleApplyLeaveForm(e) {
  e.preventDefault();
  const leave_type_id = parseInt(document.getElementById('form-leave-type').value, 10);
  const from_date = document.getElementById('form-from-date').value;
  const to_date = document.getElementById('form-to-date').value;
  const reason = document.getElementById('form-reason').value;

  try {
    const res = await api('/api/leaves', {
      method: 'POST',
      body: JSON.stringify({ leave_type_id, from_date, to_date, reason })
    });

    showToast(`Leave application submitted successfully (${res.days_requested} days)!`, 'success');
    document.getElementById('form-reason').value = '';

    // Switch to My Leaves tab to view the submitted request
    switchEmpTab('leaves');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadEmployeeQuotasTable() {
  try {
    const balRes = await api('/api/leaves/balance');
    const tbody = document.getElementById('tbody-emp-quotas-table');
    if (!tbody) return;

    tbody.innerHTML = balRes.balances.map(b => `
      <tr>
        <td><strong>${b.type_name}</strong></td>
        <td>${b.total_days} days</td>
        <td>${b.used_days} days used</td>
        <td><strong style="color: var(--brand-emerald);">${b.remaining_days} days remaining</strong></td>
        <td><small style="color: var(--text-muted);">Standard employee quota allocation per calendar year</small></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading quota table:', err);
  }
}

// =========================================================================
// HR / MANAGER PORTAL DATA & LOGIC
// =========================================================================

async function loadManagerData() {
  const status = document.getElementById('select-mgr-status-filter')?.value || '';
  const url = status ? `/api/leaves?status=${status}` : '/api/leaves';

  try {
    // 1. Approvals Queue
    const leavesRes = await api(url);
    const tbody = document.getElementById('tbody-mgr-approvals');
    if (tbody) {
      if (leavesRes.leaves.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px;">No leave requests matching criteria.</td></tr>`;
      } else {
        tbody.innerHTML = leavesRes.leaves.map(l => `
          <tr>
            <td><code>#${l.leave_id}</code></td>
            <td><strong>${l.employee_name}</strong><br><small style="color: var(--text-muted);">${l.employee_email}</small></td>
            <td>${l.department}</td>
            <td>${l.leave_type}</td>
            <td>${l.from_date} → ${l.to_date}</td>
            <td><strong>${l.days_requested}</strong></td>
            <td title="${l.reason}">${l.reason.length > 25 ? l.reason.substring(0, 25) + '...' : l.reason}</td>
            <td><span class="badge-status ${l.status}">${l.status}</span></td>
            <td>
              ${l.status === 'PENDING' ? `
                <div class="btn-action-group">
                  <button type="button" class="btn-table-action approve" onclick="promptReview(${l.leave_id}, 'APPROVED', '${l.employee_name}', '${l.leave_type}', ${l.days_requested})">Approve</button>
                  <button type="button" class="btn-table-action reject" onclick="promptReview(${l.leave_id}, 'REJECTED', '${l.employee_name}', '${l.leave_type}', ${l.days_requested})">Reject</button>
                </div>
              ` : `
                <small style="color: var(--text-muted);">${l.manager_remarks || 'Decided'}</small>
              `}
            </td>
          </tr>
        `).join('');
      }
    }

    // 2. Pending Counter Badge
    const pendingCount = leavesRes.leaves.filter(l => l.status === 'PENDING').length;
    const badge = document.getElementById('mgr-pending-badge');
    if (badge) badge.textContent = pendingCount;

    // 3. Department Overview
    const statsRes = await api('/api/stats/overview');
    const tbodyDept = document.getElementById('tbody-mgr-departments');
    if (tbodyDept && statsRes.stats.byDepartment) {
      tbodyDept.innerHTML = statsRes.stats.byDepartment.map(d => `
        <tr>
          <td><strong>${d.department}</strong></td>
          <td>${d.count} requests</td>
          <td><span style="color: var(--brand-emerald);">${d.approved} approved</span></td>
          <td><span style="color: var(--brand-amber);">${d.pending} pending</span></td>
          <td><span class="panel-tag status-active">Active</span></td>
        </tr>
      `).join('');
    }

    // 4. Decision History
    const tbodyHist = document.getElementById('tbody-mgr-history');
    if (tbodyHist) {
      const decided = leavesRes.leaves.filter(l => l.status !== 'PENDING');
      tbodyHist.innerHTML = decided.map(l => `
        <tr>
          <td><code>#${l.leave_id}</code></td>
          <td>${l.employee_name}</td>
          <td>${l.department}</td>
          <td>${l.leave_type}</td>
          <td>${l.from_date} → ${l.to_date} (${l.days_requested}d)</td>
          <td><span class="badge-status ${l.status}">${l.status}</span></td>
          <td>${l.manager_remarks || '—'}</td>
          <td><small style="color: var(--text-muted);">${l.updated_at || l.created_at}</small></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load manager queue: ' + err.message, 'error');
  }
}

function promptReview(leaveId, targetStatus, empName, leaveType, days) {
  document.getElementById('review-leave-id').value = leaveId;
  document.getElementById('review-target-status').value = targetStatus;

  const title = document.getElementById('review-modal-title');
  const details = document.getElementById('review-summary-details');
  const submitBtn = document.getElementById('btn-confirm-review');

  title.textContent = `${targetStatus === 'APPROVED' ? 'Approve' : 'Reject'} Leave #${leaveId}`;
  details.innerHTML = `
    <div><strong>Applicant:</strong> ${empName}</div>
    <div><strong>Category:</strong> ${leaveType} (${days} days)</div>
    <div><strong>Decision:</strong> Mark as <span class="badge-status ${targetStatus}">${targetStatus}</span></div>
  `;

  submitBtn.className = targetStatus === 'APPROVED' ? 'btn-dark-pill' : 'btn-table-action reject';
  submitBtn.textContent = `Confirm ${targetStatus}`;

  openModal('modal-review-leave');
}

async function handleReviewLeave(e) {
  e.preventDefault();
  const leaveId = document.getElementById('review-leave-id').value;
  const status = document.getElementById('review-target-status').value;
  const manager_remarks = document.getElementById('review-remarks').value;

  try {
    await api(`/api/leaves/${leaveId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, manager_remarks })
    });

    showToast(`Leave request #${leaveId} has been ${status}!`, 'success');
    closeModal('modal-review-leave');
    document.getElementById('review-remarks').value = '';

    loadManagerData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =========================================================================
// DEVOPS ADMIN PORTAL DATA & LOGIC
// =========================================================================

async function loadAdminData() {
  try {
    // 1. System Telemetry
    const sys = await api('/api/stats/system');
    const s = sys.system;

    document.getElementById('adm-node-ver').textContent = s.node_version;
    document.getElementById('adm-uptime').textContent = `${s.uptime_seconds}s`;
    document.getElementById('adm-memory').textContent = `${s.memory_usage_mb.rss} MB`;
    document.getElementById('adm-db-type').textContent = `${s.database.engine.toUpperCase()}`;

    // 2. Employee Directory
    const empRes = await api('/api/employees');
    const tbodyEmp = document.getElementById('tbody-adm-employees');
    if (tbodyEmp) {
      tbodyEmp.innerHTML = empRes.employees.map(e => `
        <tr>
          <td><code>#${e.employee_id}</code></td>
          <td><strong>${e.name}</strong></td>
          <td>${e.email}</td>
          <td>${e.department}</td>
          <td><span class="badge-status ${e.role === 'admin' ? 'APPROVED' : e.role === 'manager' ? 'PENDING' : 'REJECTED'}">${e.role.toUpperCase()}</span></td>
          <td>
            ${e.employee_id !== STATE.user.employee_id ? `
              <button type="button" class="btn-table-action delete" onclick="handleDeleteEmployee(${e.employee_id})">Remove</button>
            ` : `<em>Active Session</em>`}
          </td>
        </tr>
      `).join('');
    }

    // 3. Leave Policies
    const ltRes = await api('/api/leave-types');
    const tbodyLt = document.getElementById('tbody-adm-leave-types');
    if (tbodyLt) {
      tbodyLt.innerHTML = ltRes.leaveTypes.map(lt => `
        <tr>
          <td><code>#${lt.leave_type_id}</code></td>
          <td><strong>${lt.type_name}</strong></td>
          <td><strong>${lt.available_days}</strong> days/year</td>
          <td>${lt.description || '—'}</td>
          <td>
            <button type="button" class="btn-table-action delete" onclick="handleDeleteLeaveType(${lt.leave_type_id})">Delete</button>
          </td>
        </tr>
      `).join('');
    }

    // 4. Audit Logs
    const allRes = await api('/api/leaves');
    const tbodyLogs = document.getElementById('tbody-adm-audit-logs');
    if (tbodyLogs) {
      tbodyLogs.innerHTML = allRes.leaves.map(l => `
        <tr>
          <td><code>#${l.leave_id}</code></td>
          <td>${l.employee_name}</td>
          <td>${l.department}</td>
          <td>${l.leave_type}</td>
          <td>${l.from_date} → ${l.to_date}</td>
          <td>${l.days_requested}</td>
          <td><span class="badge-status ${l.status}">${l.status}</span></td>
          <td><small>${l.manager_remarks || '—'}</small></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Admin telemetry error: ' + err.message, 'error');
  }
}

function openAddEmployeeModal() {
  openModal('modal-add-employee');
}

async function handleAddEmployee(e) {
  e.preventDefault();
  const name = document.getElementById('emp-name').value;
  const email = document.getElementById('emp-email').value;
  const department = document.getElementById('emp-dept').value;
  const role = document.getElementById('emp-role').value;
  const password = document.getElementById('emp-password').value;

  try {
    await api('/api/employees', {
      method: 'POST',
      body: JSON.stringify({ name, email, department, role, password })
    });

    showToast(`Employee "${name}" created!`, 'success');
    closeModal('modal-add-employee');
    e.target.reset();
    loadAdminData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteEmployee(empId) {
  if (!confirm(`Are you sure you want to delete employee #${empId}?`)) return;
  try {
    await api(`/api/employees/${empId}`, { method: 'DELETE' });
    showToast(`Employee #${empId} removed.`, 'success');
    loadAdminData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openAddLeaveTypeModal() {
  openModal('modal-add-leave-type');
}

async function handleAddLeaveType(e) {
  e.preventDefault();
  const type_name = document.getElementById('lt-name').value;
  const available_days = document.getElementById('lt-days').value;
  const description = document.getElementById('lt-desc').value;

  try {
    await api('/api/leave-types', {
      method: 'POST',
      body: JSON.stringify({ type_name, available_days, description })
    });

    showToast(`Leave category "${type_name}" added!`, 'success');
    closeModal('modal-add-leave-type');
    e.target.reset();
    loadAdminData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteLeaveType(typeId) {
  if (!confirm(`Are you sure you want to delete leave category #${typeId}?`)) return;
  try {
    await api(`/api/leave-types/${typeId}`, { method: 'DELETE' });
    showToast('Leave category deleted.', 'success');
    loadAdminData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =========================================================================
// DEFAULT INITIALIZATION
// =========================================================================

async function loginAsDefaultEmployee() {
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'john.doe@company.com', password: 'password123' })
    });
    STATE.token = data.token;
    STATE.user = data.user;
    localStorage.setItem('leaveops_token', data.token);
    localStorage.setItem('leaveops_user', JSON.stringify(data.user));
  } catch (e) {
    console.error('Initial employee login error:', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loginAsDefaultEmployee();
  navigateRole('employee', 'overview');
});
