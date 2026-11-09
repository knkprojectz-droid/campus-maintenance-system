/**
 * Campus Maintenance and Complaint Tracking System
 * Online Smart Campus Complaint & Maintenance System
 * Dynamic Role-Based State & Supabase Realtime Backend Integration
 */

// Baseline Essential Static Administrator Account (Pre-configured static admin; All Students and Staff sign up dynamically!)
const INITIAL_USERS = [
  { id: 'ADM-001', username: 'admin', password: '123', role: 'Admin', name: 'Campus Estate Administrator', staffId: 'ADM-001', dept: 'Campus Estate Office' }
];

// ZERO static dummy staff - Staff members register dynamically via Sign Up!
const INITIAL_STAFF = [];

// ZERO static dummy complaints & feedback - All data is dynamic!
const INITIAL_COMPLAINTS = [];
const INITIAL_FEEDBACK = [];

// Local Storage Manager
class CampusStorage {
  static get(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback;
    }
  }

  static set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// Global App State
const AppState = {
  currentUser: null,
  complaints: [],
  staff: [],
  users: [],
  feedback: []
};

// Application Bootstrap
document.addEventListener('DOMContentLoaded', async () => {
  initStorage();
  initAuth();
  initNavigation();
  initComplaintForm();
  initAdminAllocationModal();
  initStaffDoneModal();
  initTrackStatus();
  initFeedbackForm();
  initDashboard();
  initSupabaseSettings();

  // Set today's date as default in Complaint Date input
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('complaintDate');
  if (dateInput) {
    dateInput.value = today;
  }

  // Load real database records from Supabase
  await loadBackendData();
  renderAll();

  // Real-time synchronization: listen for remote DB updates
  if (window.supabaseService && window.supabaseService.isConnected) {
    window.supabaseService.subscribeToChanges(async (payload) => {
      console.log('⚡ Realtime Supabase event received:', payload);
      await loadBackendData();
      renderAll();
      showToast('⚡ Live sync: complaints updated from database!', 'info');
    });
  }
});

function initStorage() {
  // Purge any legacy static mock data (users, complaints, staff) from previous runs
  const cachedUsers = localStorage.getItem('cmts_users');
  if (cachedUsers && (cachedUsers.includes('Rahul Sharma') || cachedUsers.includes('STU-2024-089') || cachedUsers.includes('Rajesh Kumar') || cachedUsers.includes('Priya Patel'))) {
    localStorage.removeItem('cmts_users');
    localStorage.removeItem('cmts_staff');
    localStorage.removeItem('cmts_current_user');
  }

  const cachedComplaints = localStorage.getItem('cmts_complaints');
  if (cachedComplaints && (cachedComplaints.includes('Ceiling fan is making loud') || cachedComplaints.includes('CMP-1001') || cachedComplaints.includes('CMP-1006') || cachedComplaints.includes('Rahul Sharma'))) {
    localStorage.removeItem('cmts_complaints');
    localStorage.removeItem('cmts_feedback');
  }

  AppState.complaints = CampusStorage.get('cmts_complaints', INITIAL_COMPLAINTS);
  AppState.staff = CampusStorage.get('cmts_staff', INITIAL_STAFF);
  AppState.users = CampusStorage.get('cmts_users', INITIAL_USERS);
  AppState.feedback = CampusStorage.get('cmts_feedback', INITIAL_FEEDBACK);
  AppState.currentUser = CampusStorage.get('cmts_current_user', null);
}

async function loadBackendData() {
  if (window.supabaseService && window.supabaseService.isConnected) {
    updateBackendStatusBadge(true);
    try {
      const [sbComplaints, sbStaff, sbFeedback, sbUsers] = await Promise.all([
        window.supabaseService.getComplaints(AppState.complaints),
        window.supabaseService.getStaff(AppState.staff),
        window.supabaseService.getFeedback(AppState.feedback),
        window.supabaseService.getUsers(AppState.users)
      ]);

      AppState.complaints = sbComplaints || [];
      AppState.staff = sbStaff || [];
      AppState.feedback = sbFeedback || [];
      
      // Always retain static Admin, and merge fetched dynamic users from Supabase
      const mergedUsers = [...INITIAL_USERS];
      if (sbUsers && sbUsers.length > 0) {
        sbUsers.forEach(u => {
          if (!mergedUsers.some(m => m.username.toLowerCase() === u.username.toLowerCase())) {
            mergedUsers.push(u);
          }
        });
      }
      AppState.users = mergedUsers;

      saveComplaints();
      saveFeedback();
    } catch (e) {
      console.warn('Falling back to local storage due to fetch error:', e);
    }
  } else {
    updateBackendStatusBadge(false);
  }
}

function saveComplaints() {
  CampusStorage.set('cmts_complaints', AppState.complaints);
}

function saveFeedback() {
  CampusStorage.set('cmts_feedback', AppState.feedback);
}

// ================= Navigation (SPA View Switching) =================
function initNavigation() {
  const navLinks = document.querySelectorAll('[data-target-view]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-target-view');
      navigateToView(targetView);

      // Close mobile menu if open
      const menu = document.querySelector('.nav-links');
      if (menu && menu.classList.contains('mobile-open')) {
        menu.classList.remove('mobile-open');
      }
    });
  });

  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      const menu = document.querySelector('.nav-links');
      menu.classList.toggle('mobile-open');
    });
  }
}

function navigateToView(viewId) {
  // If user attempts to navigate to submit complaint, enforce role access
  if (viewId === 'submitView') {
    if (!AppState.currentUser) {
      showToast('Please sign in with your Roll No to submit a complaint.', 'info');
      openModal('loginModal');
      return;
    }
    if (AppState.currentUser.role === 'Admin' || AppState.currentUser.role === 'Staff') {
      showToast(`Only Students can submit complaints. You are signed in as ${AppState.currentUser.role}.`, 'info');
      return;
    }
    updateSubmitFormPreFill();
  }

  const views = document.querySelectorAll('.page-view');
  views.forEach(v => v.classList.remove('active-view'));

  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update active state in navbar
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-target-view') === viewId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  if (viewId === 'dashboardView') {
    renderDashboardTable();
    updateDashboardStats();
  } else if (viewId === 'trackStatusView') {
    renderTrackStatusView();
  } else if (viewId === 'feedbackView') {
    renderFeedbackList();
    populateResolvedDropdown();
  } else if (viewId === 'staffView') {
    renderStaffList();
  }
}

// ================= Authentication & Registration =================
function initAuth() {
  const loginModal = document.getElementById('loginModal');
  const loginNavBtn = document.getElementById('loginNavBtn');
  const modalClose = loginModal ? loginModal.querySelector('.modal-close-btn') : null;
  const loginForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signUpForm');
  const logoutBtn = document.getElementById('logoutBtn');

  // Tab buttons
  const tabSignIn = document.getElementById('tabBtnSignIn');
  const tabSignUp = document.getElementById('tabBtnSignUp');
  const switchSignUpLink = document.getElementById('switchSignUpLink');
  const switchSignInLink = document.getElementById('switchSignInLink');

  function showSignInTab() {
    if (tabSignIn) tabSignIn.classList.add('active');
    if (tabSignUp) tabSignUp.classList.remove('active');
    if (loginForm) loginForm.style.display = 'block';
    if (signUpForm) signUpForm.style.display = 'none';
    const title = document.getElementById('authModalTitle');
    if (title) title.innerHTML = '<i class="fas fa-user-lock" style="color: #2563eb; margin-right: 8px;"></i> Sign In';
  }

  function showSignUpTab() {
    if (tabSignUp) tabSignUp.classList.add('active');
    if (tabSignIn) tabSignIn.classList.remove('active');
    if (loginForm) loginForm.style.display = 'none';
    if (signUpForm) signUpForm.style.display = 'block';
    const title = document.getElementById('authModalTitle');
    if (title) title.innerHTML = '<i class="fas fa-user-plus" style="color: #10b981; margin-right: 8px;"></i> Sign Up';
  }

  if (tabSignIn) tabSignIn.addEventListener('click', showSignInTab);
  if (tabSignUp) tabSignUp.addEventListener('click', showSignUpTab);
  if (switchSignUpLink) switchSignUpLink.addEventListener('click', showSignUpTab);
  if (switchSignInLink) switchSignInLink.addEventListener('click', showSignInTab);

  // Dynamic label & placeholder based on Sign Up role selection
  const signUpRole = document.getElementById('signUpRole');
  const signUpId = document.getElementById('signUpId');
  const signUpIdLabel = document.getElementById('signUpIdLabel');
  if (signUpRole && signUpId && signUpIdLabel) {
    signUpRole.addEventListener('change', () => {
      if (signUpRole.value === 'Staff') {
        signUpIdLabel.textContent = 'Staff ID';
        signUpId.placeholder = 'Enter Staff ID (e.g. STF-101)';
      } else {
        signUpIdLabel.textContent = 'Roll No / Student ID';
        signUpId.placeholder = 'Enter your Roll No (e.g. 2024CS01)';
      }
    });
  }

  if (loginNavBtn) {
    loginNavBtn.addEventListener('click', () => {
      showSignInTab();
      openModal('loginModal');
    });
  }

  const dashboardLoginPromptBtn = document.getElementById('dashboardLoginPromptBtn');
  if (dashboardLoginPromptBtn) {
    dashboardLoginPromptBtn.addEventListener('click', () => {
      showSignInTab();
      openModal('loginModal');
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => closeModal('loginModal'));
  }

  // --- SIGN IN HANDLER ---
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value.trim();
      const role = document.getElementById('loginRole').value;

      // Allow login via username OR Roll No / Student ID OR Staff ID
      const user = AppState.users.find(u => {
        const matchesRole = u.role.toLowerCase() === role.toLowerCase();
        const matchesPassword = u.password === password;
        const matchesIdentifier = (
          u.username.toLowerCase() === identifier.toLowerCase() ||
          (u.studentId && u.studentId.toLowerCase() === identifier.toLowerCase()) ||
          (u.staffId && u.staffId.toLowerCase() === identifier.toLowerCase())
        );
        return matchesRole && matchesPassword && matchesIdentifier;
      });

      if (user) {
        AppState.currentUser = user;
        CampusStorage.set('cmts_current_user', user);
        showToast(`Welcome, ${user.name} (${user.role})!`, 'success');
        closeModal('loginModal');
        updateAuthUI();
        navigateToView('dashboardView');
      } else {
        showToast(`Invalid credentials for ${role}. Please check your Roll No/ID and password.`, 'danger');
      }
    });
  }

  // --- SIGN UP HANDLER ---
  if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const role = document.getElementById('signUpRole').value;
      const idCode = document.getElementById('signUpId').value.trim();
      const fullName = document.getElementById('signUpFullName').value.trim();
      const dept = document.getElementById('signUpDept').value.trim();
      const password = document.getElementById('signUpPassword').value.trim();

      if (!idCode || !fullName || !dept || !password) {
        showToast('Please fill out all required fields.', 'danger');
        return;
      }

      // Check if ID already exists
      const exists = AppState.users.some(u => 
        (u.studentId && u.studentId.toLowerCase() === idCode.toLowerCase()) ||
        (u.staffId && u.staffId.toLowerCase() === idCode.toLowerCase()) ||
        u.username.toLowerCase() === idCode.toLowerCase()
      );

      if (exists) {
        showToast(`An account with ID "${idCode}" already exists. Please sign in.`, 'danger');
        showSignInTab();
        return;
      }

      const newUser = {
        id: role === 'Staff' ? idCode : (Date.now().toString()),
        username: idCode.toLowerCase().replace(/\s+/g, '_'),
        password,
        role,
        name: fullName,
        email: `${idCode.toLowerCase()}@campus.edu`,
        studentId: role === 'Student' ? idCode : undefined,
        staffId: role === 'Staff' ? idCode : undefined,
        dept
      };

      // Save to Supabase
      if (window.supabaseService && window.supabaseService.isConnected) {
        try {
          await window.supabaseService.insertUser(newUser);
          if (role === 'Staff') {
            await window.supabaseService.insertStaff({
              id: idCode,
              name: fullName,
              department: dept,
              phone: '+91 98765 00000',
              status: 'Available'
            });
          }
          showToast('Account successfully registered in Supabase!', 'success');
        } catch (err) {
          console.warn('Supabase registration error:', err);
        }
      }

      // Save to staff list if staff signed up
      if (role === 'Staff') {
        const staffObj = {
          id: idCode,
          name: fullName,
          department: dept,
          phone: '+91 98765 00000',
          activeTasks: 0,
          status: 'Available'
        };
        if (!AppState.staff.some(s => s.id === idCode)) {
          AppState.staff.push(staffObj);
          CampusStorage.set('cmts_staff', AppState.staff);
        }
      }

      AppState.users.push(newUser);
      CampusStorage.set('cmts_users', AppState.users);

      // Auto login
      AppState.currentUser = newUser;
      CampusStorage.set('cmts_current_user', newUser);

      showToast(`Welcome to Smart Campus, ${fullName}!`, 'success');
      signUpForm.reset();
      closeModal('loginModal');
      updateAuthUI();
      renderStaffList();
      navigateToView('dashboardView');
    });
  }

  // --- LOGOUT HANDLER ---
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      AppState.currentUser = null;
      CampusStorage.set('cmts_current_user', null);
      showToast('Logged out successfully.', 'info');
      updateAuthUI();
      navigateToView('homeView');
    });
  }

  // Quick 1-click Static Admin Auto-Fill
  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const demoRole = btn.getAttribute('data-demo-role');
      if (demoRole === 'Admin') {
        document.getElementById('loginUsername').value = 'admin';
        document.getElementById('loginPassword').value = '123';
        document.getElementById('loginRole').value = 'Admin';
      }
    });
  });

  updateAuthUI();
}

function updateAuthUI() {
  const loginNavBtn = document.getElementById('loginNavBtn');
  const userProfileArea = document.getElementById('userProfileArea');
  const loggedUserName = document.getElementById('loggedUserName');
  const loggedUserRole = document.getElementById('loggedUserRole');
  const dashboardBadge = document.getElementById('dashboardUserBadge');
  const navItemSubmit = document.getElementById('navItemSubmitComplaint');
  const dashboardNewComplaintBtn = document.getElementById('dashboardNewComplaintBtn');

  if (AppState.currentUser) {
    if (loginNavBtn) loginNavBtn.style.display = 'none';
    if (userProfileArea) userProfileArea.style.display = 'flex';
    if (loggedUserName) {
      const displayName = AppState.currentUser.role === 'Admin' ? 'Estate Admin' : AppState.currentUser.name;
      loggedUserName.textContent = displayName;
      loggedUserName.title = `${AppState.currentUser.name} (${AppState.currentUser.role})`;
    }
    if (loggedUserRole) loggedUserRole.textContent = AppState.currentUser.role;
    if (dashboardBadge) {
      const idTag = AppState.currentUser.studentId || AppState.currentUser.staffId || AppState.currentUser.username;
      dashboardBadge.innerHTML = `<i class="fas fa-user-check"></i> ${AppState.currentUser.name} (${AppState.currentUser.role} - ${idTag})`;
    }

    // Role-based visibility of "Submit Complaint":
    // Only Students (and guests) submit complaints; Admin and Staff manage/resolve them!
    const isStaffOrAdmin = AppState.currentUser.role === 'Admin' || AppState.currentUser.role === 'Staff';
    if (navItemSubmit) {
      navItemSubmit.style.display = isStaffOrAdmin ? 'none' : '';
    }
    if (dashboardNewComplaintBtn) {
      dashboardNewComplaintBtn.style.display = isStaffOrAdmin ? 'none' : 'inline-flex';
    }

    updateSubmitFormPreFill();
  } else {
    if (loginNavBtn) loginNavBtn.style.display = 'inline-flex';
    if (userProfileArea) userProfileArea.style.display = 'none';
    if (navItemSubmit) navItemSubmit.style.display = '';
    if (dashboardNewComplaintBtn) dashboardNewComplaintBtn.style.display = 'inline-flex';
    if (dashboardBadge) {
      dashboardBadge.innerHTML = '<i class="fas fa-user-clock"></i> Guest / Public Overview';
    }
  }
}

function updateSubmitFormPreFill() {
  const nameInput = document.getElementById('studentName');
  const idInput = document.getElementById('studentID');

  if (AppState.currentUser && AppState.currentUser.role === 'Student') {
    if (nameInput) {
      nameInput.value = AppState.currentUser.name;
      nameInput.setAttribute('readonly', 'true');
    }
    if (idInput) {
      idInput.value = AppState.currentUser.studentId || AppState.currentUser.username;
      idInput.setAttribute('readonly', 'true');
    }
  } else if (!AppState.currentUser) {
    if (nameInput) nameInput.removeAttribute('readonly');
    if (idInput) idInput.removeAttribute('readonly');
  }
}

// ================= Submit Complaint Form (Image 5) =================
function initComplaintForm() {
  const form = document.getElementById('submitComplaintForm');
  const resetBtn = document.getElementById('resetComplaintBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!AppState.currentUser) {
        showToast('Please sign in with your Roll No before submitting a complaint.', 'danger');
        openModal('loginModal');
        return;
      }

      const studentName = document.getElementById('studentName').value.trim();
      const studentID = document.getElementById('studentID').value.trim();
      const location = document.getElementById('complaintLocation').value.trim();
      const category = document.getElementById('complaintCategory').value;
      const complaintDate = document.getElementById('complaintDate').value;
      const description = document.getElementById('complaintDescription').value.trim();

      if (!studentName || !studentID || !location || !category || !complaintDate) {
        showToast('Please fill out all required fields marked with *', 'danger');
        return;
      }

      // Generate next Complaint ID (e.g. CMP-1001)
      const nextIdNumber = AppState.complaints.length > 0 
        ? Math.max(...AppState.complaints.map(c => parseInt(String(c.id).replace('CMP-', '')) || 1000)) + 1 
        : 1001;
      const newId = `CMP-${nextIdNumber}`;

      const newComplaint = {
        id: newId,
        studentName,
        studentId: studentID,
        location,
        category,
        date: complaintDate,
        description: description || 'Maintenance issue reported by student.',
        assignedStaff: 'Unassigned',
        status: 'Pending',
        remarks: 'Registered. Pending staff allocation by Administrator.',
        createdAt: new Date().toISOString()
      };

      // Insert into Supabase
      if (window.supabaseService && window.supabaseService.isConnected) {
        try {
          await window.supabaseService.insertComplaint(newComplaint);
          showToast(`Complaint ${newId} registered in Supabase database!`, 'success');
        } catch (err) {
          console.warn('Supabase complaint insert failed, saving locally:', err);
        }
      }

      AppState.complaints.unshift(newComplaint);
      saveComplaints();

      showComplaintSuccessModal(newComplaint);

      // Reset form
      form.reset();
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('complaintDate').value = today;
      updateSubmitFormPreFill();

      updateDashboardStats();
      renderDashboardTable();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('complaintDate').value = today;
      updateSubmitFormPreFill();
      showToast('Form cleared.', 'info');
    });
  }
}

function showComplaintSuccessModal(complaint) {
  const modal = document.getElementById('successReceiptModal');
  if (!modal) return;

  document.getElementById('receiptComplaintId').textContent = complaint.id;
  document.getElementById('receiptStudentName').textContent = complaint.studentName;
  document.getElementById('receiptCategory').textContent = complaint.category;
  document.getElementById('receiptLocation').textContent = complaint.location;
  document.getElementById('receiptDate').textContent = complaint.date;
  document.getElementById('receiptAssigned').textContent = complaint.assignedStaff;

  openModal('successReceiptModal');
}

// ================= Admin Staff Allocation Workflow =================
function initAdminAllocationModal() {
  const form = document.getElementById('allocateStaffForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const complaintId = document.getElementById('allocComplaintId').value;
      const selectedStaffName = document.getElementById('allocSelectStaff').value;
      const remarks = document.getElementById('allocRemarks').value.trim();

      if (!selectedStaffName) {
        showToast('Please select a staff member to allocate.', 'danger');
        return;
      }

      const complaint = AppState.complaints.find(c => c.id === complaintId);
      if (!complaint) return;

      complaint.assignedStaff = selectedStaffName;
      complaint.status = 'In Progress';
      complaint.remarks = remarks || `Allocated to ${selectedStaffName} by Administrator. Work in progress.`;

      // Update Supabase
      if (window.supabaseService && window.supabaseService.isConnected) {
        try {
          await window.supabaseService.updateComplaint(complaintId, {
            assignedStaff: selectedStaffName,
            status: 'In Progress',
            remarks: complaint.remarks
          });
          showToast(`Task allocated to ${selectedStaffName} in database!`, 'success');
        } catch (err) {
          console.warn('Supabase update failed:', err);
        }
      }

      saveComplaints();
      closeModal('allocateStaffModal');
      renderDashboardTable();
      updateDashboardStats();
      renderStaffList();
    });
  }
}

function openAllocateModal(complaintId) {
  const complaint = AppState.complaints.find(c => c.id === complaintId);
  if (!complaint) return;

  document.getElementById('allocComplaintId').value = complaint.id;
  document.getElementById('allocStudentName').value = `${complaint.studentName} (${complaint.studentId})`;
  document.getElementById('allocLocation').value = `${complaint.location} [${complaint.category}]`;
  document.getElementById('allocDescription').value = complaint.description;
  document.getElementById('allocRemarks').value = '';

  // Populate staff dropdown
  const select = document.getElementById('allocSelectStaff');
  select.innerHTML = '<option value="" disabled selected>-- Select Technician to Allocate --</option>';
  
  if (AppState.staff.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.disabled = true;
    opt.textContent = '-- No registered staff available (Staff must Sign Up first) --';
    select.appendChild(opt);
  } else {
    AppState.staff.forEach(s => {
      const activeTasks = AppState.complaints.filter(c => c.assignedStaff === s.name && c.status !== 'Resolved').length;
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = `${s.name} (${s.department}) - [${activeTasks} Active Task(s)]`;
      if (complaint.assignedStaff === s.name) opt.selected = true;
      select.appendChild(opt);
    });
  }

  openModal('allocateStaffModal');
}

// ================= Staff "Done" (Mark as Resolved) Workflow =================
function initStaffDoneModal() {
  const form = document.getElementById('staffDoneForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const complaintId = document.getElementById('doneComplaintId').value;
      const remarks = document.getElementById('doneResolutionRemarks').value.trim();

      const complaint = AppState.complaints.find(c => c.id === complaintId);
      if (!complaint) return;

      complaint.status = 'Resolved';
      complaint.remarks = remarks || 'Work completed and verified by maintenance staff.';

      // Update Supabase
      if (window.supabaseService && window.supabaseService.isConnected) {
        try {
          await window.supabaseService.updateComplaint(complaintId, {
            status: 'Resolved',
            remarks: complaint.remarks
          });
          showToast(`Complaint ${complaintId} marked as Resolved in database!`, 'success');
        } catch (err) {
          console.warn('Supabase update error:', err);
        }
      }

      saveComplaints();
      closeModal('staffDoneModal');
      showToast(`Complaint ${complaintId} has been marked as Resolved!`, 'success');
      renderDashboardTable();
      updateDashboardStats();
      renderStaffList();
      populateResolvedDropdown();
    });
  }
}

function openStaffDoneDialog(complaintId) {
  const complaint = AppState.complaints.find(c => c.id === complaintId);
  if (!complaint) return;

  document.getElementById('doneComplaintId').value = complaint.id;
  document.getElementById('doneDisplayId').textContent = complaint.id;
  document.getElementById('doneDisplayLocation').textContent = `${complaint.location} (${complaint.category})`;
  document.getElementById('doneDisplayDesc').textContent = complaint.description;
  document.getElementById('doneResolutionRemarks').value = '';

  openModal('staffDoneModal');
}

// ================= Dashboard & Role-Specific Filter =================
function initDashboard() {
  const searchInput = document.getElementById('dashboardSearch');
  const statusFilter = document.getElementById('dashboardStatusFilter');
  const categoryFilter = document.getElementById('dashboardCategoryFilter');

  if (searchInput) searchInput.addEventListener('input', () => renderDashboardTable());
  if (statusFilter) statusFilter.addEventListener('change', () => renderDashboardTable());
  if (categoryFilter) categoryFilter.addEventListener('change', () => renderDashboardTable());
}

function getRoleFilteredComplaints() {
  const user = AppState.currentUser;
  if (!user) {
    return AppState.complaints;
  }

  // 1. STUDENT: Show ONLY complaints submitted by this student (Roll No or Name)
  if (user.role === 'Student') {
    const studentIdNorm = (user.studentId || user.username).toLowerCase();
    const studentNameNorm = user.name.toLowerCase();
    return AppState.complaints.filter(c => 
      String(c.studentId).toLowerCase() === studentIdNorm ||
      String(c.studentName).toLowerCase() === studentNameNorm
    );
  }

  // 2. STAFF: Show ONLY complaints allocated to THIS staff technician
  if (user.role === 'Staff') {
    const staffNameNorm = user.name.toLowerCase();
    const staffIdNorm = (user.staffId || user.username).toLowerCase();
    return AppState.complaints.filter(c => 
      String(c.assignedStaff).toLowerCase() === staffNameNorm ||
      String(c.assignedStaff).toLowerCase() === staffIdNorm
    );
  }

  // 3. ADMIN: Show ALL complaints
  return AppState.complaints;
}

function updateDashboardStats() {
  const roleComplaints = getRoleFilteredComplaints();

  const total = roleComplaints.length;
  const pending = roleComplaints.filter(c => c.status === 'Pending').length;
  const inProgress = roleComplaints.filter(c => c.status === 'In Progress').length;
  const resolved = roleComplaints.filter(c => c.status === 'Resolved').length;

  const totalEl = document.getElementById('statTotal');
  const pendingEl = document.getElementById('statPending');
  const inProgressEl = document.getElementById('statInProgress');
  const resolvedEl = document.getElementById('statResolved');

  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (inProgressEl) inProgressEl.textContent = inProgress;
  if (resolvedEl) resolvedEl.textContent = resolved;
}

function renderDashboardTable() {
  const tbody = document.getElementById('complaintsTableBody');
  if (!tbody) return;

  const user = AppState.currentUser;
  const banner = document.getElementById('roleDashboardBanner');
  const bannerText = document.getElementById('roleBannerText');
  const promptBtn = document.getElementById('dashboardLoginPromptBtn');
  const dashTitle = document.getElementById('dashboardTitle');
  const dashSubtitle = document.getElementById('dashboardSubtitle');
  const newComplaintBtn = document.getElementById('dashboardNewComplaintBtn');

  // Configure Banner and Titles by Role
  if (!user) {
    if (banner) {
      banner.className = 'role-dashboard-banner';
      bannerText.innerHTML = '<strong><i class="fas fa-info-circle"></i> Public Overview:</strong> Sign in as a <strong>Student</strong> (to view your complaints), <strong>Staff</strong> (to view allocated maintenance tasks), or <strong>Admin</strong> (to allocate staff).';
      if (promptBtn) promptBtn.style.display = 'inline-flex';
    }
    if (dashTitle) dashTitle.textContent = 'Campus Maintenance Dashboard';
    if (dashSubtitle) dashSubtitle.textContent = 'Public real-time status overview of campus maintenance requests';
    if (newComplaintBtn) newComplaintBtn.style.display = 'inline-flex';
  } else if (user.role === 'Student') {
    if (banner) {
      banner.className = 'role-dashboard-banner';
      bannerText.innerHTML = `<strong><i class="fas fa-user-graduate"></i> Student Workspace:</strong> Welcome, <strong>${user.name}</strong> (Roll No: <strong>${user.studentId || user.username}</strong>). Showing only your submitted complaints.`;
      if (promptBtn) promptBtn.style.display = 'none';
    }
    if (dashTitle) dashTitle.textContent = 'My Submitted Complaints';
    if (dashSubtitle) dashSubtitle.textContent = `Showing only complaints registered under Roll No: ${user.studentId || user.username}`;
    if (newComplaintBtn) newComplaintBtn.style.display = 'inline-flex';
  } else if (user.role === 'Staff') {
    if (banner) {
      banner.className = 'role-dashboard-banner staff-mode';
      bannerText.innerHTML = `<strong><i class="fas fa-hard-hat"></i> Staff Maintenance Queue:</strong> Welcome, <strong>${user.name}</strong> (${user.dept || 'Technician'}). Showing complaints allocated to you by Admin. Complete the repair and click <strong>Done</strong>.`;
      if (promptBtn) promptBtn.style.display = 'none';
    }
    if (dashTitle) dashTitle.textContent = `Allocated Worklist — ${user.name}`;
    if (dashSubtitle) dashSubtitle.textContent = 'Showing maintenance complaints allocated to you by the Administrator';
    if (newComplaintBtn) newComplaintBtn.style.display = 'none';
  } else if (user.role === 'Admin') {
    if (banner) {
      banner.className = 'role-dashboard-banner admin-mode';
      bannerText.innerHTML = `<strong><i class="fas fa-user-shield"></i> Administrator Console:</strong> Review all student maintenance issues campus-wide and allocate technicians.`;
      if (promptBtn) promptBtn.style.display = 'none';
    }
    if (dashTitle) dashTitle.textContent = 'Campus Admin Console — All Complaints';
    if (dashSubtitle) dashSubtitle.textContent = 'Complete view of all campus complaints with staff allocation controls';
    if (newComplaintBtn) newComplaintBtn.style.display = 'none';
  }

  // Get filtered complaints based on current role
  let list = getRoleFilteredComplaints();

  // Search & Filter
  const searchQuery = (document.getElementById('dashboardSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('dashboardStatusFilter')?.value || 'all';
  const categoryFilter = document.getElementById('dashboardCategoryFilter')?.value || 'all';

  if (searchQuery) {
    list = list.filter(c => 
      String(c.id).toLowerCase().includes(searchQuery) ||
      String(c.studentName).toLowerCase().includes(searchQuery) ||
      String(c.studentId).toLowerCase().includes(searchQuery) ||
      String(c.location).toLowerCase().includes(searchQuery) ||
      String(c.category).toLowerCase().includes(searchQuery) ||
      String(c.assignedStaff).toLowerCase().includes(searchQuery)
    );
  }

  if (statusFilter !== 'all') {
    list = list.filter(c => c.status === statusFilter);
  }

  if (categoryFilter !== 'all') {
    list = list.filter(c => c.category === categoryFilter);
  }

  if (list.length === 0) {
    let emptyMsg = 'No complaints found.';
    if (user && user.role === 'Student') {
      emptyMsg = 'You have not submitted any complaints yet. Click "Submit New Complaint" to register an issue.';
    } else if (user && user.role === 'Staff') {
      emptyMsg = 'No maintenance tasks allocated to you by Admin right now. You are all caught up!';
    } else if (user && user.role === 'Admin') {
      emptyMsg = 'No complaints registered in the system yet.';
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: #64748b;">
          <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.8rem; color: #cbd5e1; display: block;"></i>
          <strong>${emptyMsg}</strong>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(c => {
    let statusClass = 'status-pending';
    if (c.status === 'In Progress') statusClass = 'status-in-progress';
    if (c.status === 'Resolved') statusClass = 'status-resolved';

    // Tailor Actions based on current role
    let actionButtonsHtml = '';

    // 1. ADMIN ACTIONS: Can allocate staff on any complaint
    if (user && user.role === 'Admin') {
      if (c.status !== 'Resolved') {
        actionButtonsHtml += `
          <button class="btn-action-allocate" onclick="openAllocateModal('${c.id}')" title="Allocate Maintenance Staff">
            <i class="fas fa-user-plus"></i> Allocate Staff
          </button>
        `;
      }
      actionButtonsHtml += `
        <button class="btn-action-view" onclick="trackSpecificComplaint('${c.id}')" title="View Timeline">
          <i class="fas fa-eye"></i> View
        </button>
      `;
    }
    // 2. STAFF ACTIONS: Can click "Done" to resolve their allocated problem
    else if (user && user.role === 'Staff') {
      if (c.status !== 'Resolved') {
        actionButtonsHtml += `
          <button class="btn-action-done" onclick="openStaffDoneDialog('${c.id}')" title="Complete task and mark as resolved">
            <i class="fas fa-check-circle"></i> Done
          </button>
        `;
      } else {
        actionButtonsHtml += `
          <span class="status-pill status-resolved" style="font-size: 0.8rem;">
            <i class="fas fa-check"></i> Completed
          </span>
        `;
      }
      actionButtonsHtml += `
        <button class="btn-action-view" onclick="trackSpecificComplaint('${c.id}')" title="View Details">
          <i class="fas fa-eye"></i> View
        </button>
      `;
    }
    // 3. STUDENT ACTIONS: Can view status & give feedback on resolved issues
    else if (user && user.role === 'Student') {
      actionButtonsHtml += `
        <button class="btn-action-view" onclick="trackSpecificComplaint('${c.id}')" title="Track Live Status">
          <i class="fas fa-search-location"></i> Track
        </button>
      `;
      if (c.status === 'Resolved') {
        actionButtonsHtml += `
          <button class="btn-action-resolve" onclick="goToFeedback('${c.id}', '${escapeHtml(c.studentName)}')" title="Rate Service">
            <i class="fas fa-star"></i> Feedback
          </button>
        `;
      }
    }
    // 4. GUEST ACTIONS
    else {
      actionButtonsHtml += `
        <button class="btn-action-view" onclick="trackSpecificComplaint('${c.id}')">
          <i class="fas fa-eye"></i> View
        </button>
      `;
    }

    return `
      <tr>
        <td><strong>${escapeHtml(c.id)}</strong></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(c.studentName)}</div>
          <div style="font-size: 0.78rem; color: #64748b;">Roll No: ${escapeHtml(c.studentId)}</div>
        </td>
        <td>${escapeHtml(c.location)}</td>
        <td><span style="font-weight: 500;">${escapeHtml(c.category)}</span></td>
        <td>${escapeHtml(c.date)}</td>
        <td>
          <span style="font-weight: 600; color: ${c.assignedStaff === 'Unassigned' ? '#ef4444' : '#1e3a8a'}">
            ${c.assignedStaff === 'Unassigned' ? '<i class="fas fa-exclamation-circle"></i> Unassigned' : `<i class="fas fa-hard-hat"></i> ${escapeHtml(c.assignedStaff)}`}
          </span>
        </td>
        <td>
          <span class="status-pill ${statusClass}">
            ● ${escapeHtml(c.status)}
          </span>
        </td>
        <td>
          <div class="table-actions">
            ${actionButtonsHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ================= Track Status View (Image 2 & 4) =================
function initTrackStatus() {
  rebindTrackSearch();
}

function rebindTrackSearch() {
  const trackBtn = document.getElementById('searchTrackBtn');
  const trackInput = document.getElementById('trackComplaintIdInput');

  if (trackBtn && trackInput) {
    trackBtn.onclick = () => {
      const q = trackInput.value.trim();
      if (!q) {
        showToast('Please enter a Complaint ID or Student Roll No.', 'danger');
        return;
      }
      performTrack(q);
    };

    trackInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        trackBtn.click();
      }
    };
  }
}

function renderTrackStatusView() {
  const resultContainer = document.getElementById('trackResultContainer');
  const searchBox = document.querySelector('.track-search-box');
  if (!resultContainer) return;

  const user = AppState.currentUser;

  // CASE 1: LOGGED IN AS STUDENT (Automatically display their submitted complaints!)
  if (user && user.role === 'Student') {
    const studentIdNorm = (user.studentId || user.username).toLowerCase();
    const studentNameNorm = user.name.toLowerCase();
    const studentComplaints = AppState.complaints.filter(c => 
      String(c.studentId).toLowerCase() === studentIdNorm ||
      String(c.studentName).toLowerCase() === studentNameNorm
    );

    if (searchBox) {
      searchBox.innerHTML = `
        <h2 style="font-size: 1.5rem; color: var(--primary); margin-bottom: 0.4rem;">
          <i class="fas fa-search-location" style="color: #2563eb;"></i> My Complaints Live Status
        </h2>
        <p style="color: var(--text-muted); font-size: 0.92rem;">
          Showing real-time progress for complaints registered under <strong>${escapeHtml(user.name)}</strong> (Roll No: <strong>${escapeHtml(user.studentId || user.username)}</strong>)
        </p>
        <div class="track-input-group" style="margin-top: 1rem;">
          <input type="text" id="trackComplaintIdInput" class="form-control" placeholder="Search specific Complaint ID or location...">
          <button class="btn-submit" id="searchTrackBtn" style="white-space: nowrap;">
            <i class="fas fa-search"></i> Search
          </button>
        </div>
      `;
      rebindTrackSearch();
    }

    if (studentComplaints.length === 0) {
      resultContainer.innerHTML = `
        <div style="text-align: center; padding: 2.8rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 680px; margin: 0 auto;">
          <i class="fas fa-clipboard-check" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem; display: block;"></i>
          <h3 style="color: #1e293b; margin-bottom: 0.5rem;">No Complaints Registered Yet</h3>
          <p style="color: #64748b; font-size: 0.92rem; margin-bottom: 1.4rem;">
            You haven't submitted any maintenance requests under your Roll No: <strong>${escapeHtml(user.studentId || user.username)}</strong>.
          </p>
          <button class="btn-submit" onclick="navigateToView('submitView')">
            <i class="fas fa-plus-circle"></i> Submit a New Complaint
          </button>
        </div>
      `;
      return;
    }

    // Render all submitted complaints for this student with their live trackers
    resultContainer.innerHTML = studentComplaints.map(c => generateComplaintTrackerHtml(c)).join('');
    return;
  }

  // CASE 2: LOGGED IN AS STAFF (Automatically show tasks allocated to them)
  if (user && user.role === 'Staff') {
    const staffNameNorm = user.name.toLowerCase();
    const staffIdNorm = (user.staffId || user.username).toLowerCase();
    const allocatedComplaints = AppState.complaints.filter(c => 
      String(c.assignedStaff).toLowerCase() === staffNameNorm ||
      String(c.assignedStaff).toLowerCase() === staffIdNorm
    );

    if (searchBox) {
      searchBox.innerHTML = `
        <h2 style="font-size: 1.5rem; color: var(--primary); margin-bottom: 0.4rem;">
          <i class="fas fa-tasks" style="color: #10b981;"></i> My Allocated Tasks Status
        </h2>
        <p style="color: var(--text-muted); font-size: 0.92rem;">
          Showing live tracking for maintenance jobs allocated to <strong>${escapeHtml(user.name)}</strong> (${escapeHtml(user.dept || 'Staff')})
        </p>
        <div class="track-input-group" style="margin-top: 1rem;">
          <input type="text" id="trackComplaintIdInput" class="form-control" placeholder="Search specific Complaint ID...">
          <button class="btn-submit" id="searchTrackBtn" style="white-space: nowrap;">
            <i class="fas fa-search"></i> Search
          </button>
        </div>
      `;
      rebindTrackSearch();
    }

    if (allocatedComplaints.length === 0) {
      resultContainer.innerHTML = `
        <div style="text-align: center; padding: 2.8rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 680px; margin: 0 auto;">
          <i class="fas fa-check-circle" style="font-size: 3rem; color: #10b981; margin-bottom: 1rem; display: block;"></i>
          <h3 style="color: #1e293b; margin-bottom: 0.5rem;">All Caught Up!</h3>
          <p style="color: #64748b; font-size: 0.92rem;">No active maintenance tasks allocated to you by Admin at this time.</p>
        </div>
      `;
      return;
    }

    resultContainer.innerHTML = allocatedComplaints.map(c => generateComplaintTrackerHtml(c)).join('');
    return;
  }

  // CASE 3: BEFORE LOGIN (User enters Complaint ID or Student ID to track)
  if (searchBox) {
    searchBox.innerHTML = `
      <h2 style="font-size: 1.5rem; color: var(--primary); margin-bottom: 0.5rem;">Track Complaint Status</h2>
      <p style="color: var(--text-muted); font-size: 0.92rem;">
        Track your registered complaint's real-time progress from Pending to In Progress and Resolved.
      </p>
      <div class="track-input-group">
        <input type="text" id="trackComplaintIdInput" class="form-control" placeholder="Enter Complaint ID (e.g. CMP-1001) or Student Roll No...">
        <button class="btn-submit" id="searchTrackBtn" style="white-space: nowrap;">
          <i class="fas fa-search"></i> Track Status
        </button>
      </div>
    `;
    rebindTrackSearch();
  }

  resultContainer.innerHTML = `
    <div style="text-align: center; padding: 2.5rem; color: #64748b; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 680px; margin: 0 auto;">
      <i class="fas fa-search-location" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem; display: block;"></i>
      <h4 style="color: #1e293b; margin-bottom: 0.4rem;">Enter Complaint ID or Student Roll No</h4>
      <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 1.2rem;">
        Enter your Complaint ID or Roll No above to track, or sign in to automatically view all your submitted complaints.
      </p>
      <button class="btn-login" onclick="openModal('loginModal')">
        <i class="fas fa-sign-in-alt"></i> Login to View My Complaints
      </button>
    </div>
  `;
}

function trackSpecificComplaint(complaintId) {
  navigateToView('trackStatusView');
  const input = document.getElementById('trackComplaintIdInput');
  if (input) input.value = complaintId;
  performTrack(complaintId);
}

function performTrack(query) {
  const normalized = query.toLowerCase();
  const matches = AppState.complaints.filter(c => 
    String(c.id).toLowerCase() === normalized || 
    String(c.studentId).toLowerCase() === normalized ||
    String(c.studentName).toLowerCase().includes(normalized) ||
    String(c.location).toLowerCase().includes(normalized)
  );

  const resultContainer = document.getElementById('trackResultContainer');
  if (!resultContainer) return;

  if (matches.length === 0) {
    resultContainer.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 680px; margin: 0 auto;">
        <i class="fas fa-search" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 0.8rem;"></i>
        <h4 style="color: #1e293b;">No Record Found</h4>
        <p style="color: #64748b; font-size: 0.9rem; margin-top: 4px;">
          No matching records for "<strong>${escapeHtml(query)}</strong>". Please double check your Complaint ID (e.g. CMP-1001) or Roll No.
        </p>
      </div>
    `;
    return;
  }

  resultContainer.innerHTML = matches.map(c => generateComplaintTrackerHtml(c)).join('');
}

function generateComplaintTrackerHtml(match) {
  let stage = 1;
  if (match.assignedStaff && match.assignedStaff !== 'Unassigned') stage = 2;
  if (match.status === 'In Progress') stage = 3;
  if (match.status === 'Resolved') stage = 4;

  return `
    <div class="timeline-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.8rem;">
        <div>
          <span style="font-size: 0.82rem; font-weight: 700; color: #2563eb; text-transform: uppercase;">Tracking Details</span>
          <h2 style="font-size: 1.4rem; color: #1e3a8a; margin-top: 2px;">Complaint ID: ${match.id}</h2>
          <p style="color: #64748b; font-size: 0.88rem;">Submitted by: <strong>${escapeHtml(match.studentName)}</strong> (Roll No: ${escapeHtml(match.studentId)})</p>
        </div>
        <div style="text-align: right;">
          <span class="status-pill ${match.status === 'Resolved' ? 'status-resolved' : (match.status === 'In Progress' ? 'status-in-progress' : 'status-pending')}" style="font-size: 0.9rem; padding: 5px 14px;">
            ● ${match.status}
          </span>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Date: ${match.date}</div>
        </div>
      </div>

      <!-- Flow Chart Visual Tracker (Image 1 flow) -->
      <div class="timeline-tracker">
        <div class="timeline-node ${stage >= 1 ? 'completed' : 'active'}">
          <div class="timeline-circle"><i class="fas fa-file-alt"></i></div>
          <div class="timeline-label">Registered</div>
          <div class="timeline-desc">Student submitted</div>
        </div>

        <div class="timeline-node ${stage > 2 ? 'completed' : (stage === 2 ? 'active' : '')}">
          <div class="timeline-circle"><i class="fas fa-user-check"></i></div>
          <div class="timeline-label">Staff Allocated</div>
          <div class="timeline-desc">${match.assignedStaff !== 'Unassigned' ? escapeHtml(match.assignedStaff) : 'Pending Allocation'}</div>
        </div>

        <div class="timeline-node ${stage > 3 ? 'completed' : (stage === 3 ? 'active' : '')}">
          <div class="timeline-circle"><i class="fas fa-wrench"></i></div>
          <div class="timeline-label">In Progress</div>
          <div class="timeline-desc">Repair in Progress</div>
        </div>

        <div class="timeline-node ${stage === 4 ? 'completed' : ''}">
          <div class="timeline-circle"><i class="fas fa-check-circle"></i></div>
          <div class="timeline-label">Resolved</div>
          <div class="timeline-desc">${stage === 4 ? 'Done & Verified' : 'Pending resolution'}</div>
        </div>
      </div>

      <!-- Detail Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; background: #f8fafc; padding: 1.2rem; border-radius: 8px; margin-top: 1.5rem;">
        <div>
          <span style="font-size: 0.78rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Category</span>
          <p style="font-weight: 600; color: #1e293b;">${escapeHtml(match.category)}</p>
        </div>
        <div>
          <span style="font-size: 0.78rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Location</span>
          <p style="font-weight: 600; color: #1e293b;">${escapeHtml(match.location)}</p>
        </div>
        <div>
          <span style="font-size: 0.78rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Allocated Technician</span>
          <p style="font-weight: 600; color: #1e293b;">${escapeHtml(match.assignedStaff)}</p>
        </div>
        <div>
          <span style="font-size: 0.78rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Current Status</span>
          <p style="font-weight: 600; color: #1e293b;">${escapeHtml(match.status)}</p>
        </div>
      </div>

      <div style="margin-top: 1.2rem;">
        <span style="font-size: 0.8rem; color: #64748b; font-weight: 600;">REPORTED ISSUE:</span>
        <p style="background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.8rem; margin-top: 4px; font-size: 0.92rem;">
          ${escapeHtml(match.description)}
        </p>
      </div>

      <div style="margin-top: 1rem;">
        <span style="font-size: 0.8rem; color: #0d9488; font-weight: 700;">MAINTENANCE LOG & REMARKS:</span>
        <div style="background: #f0fdfa; border-left: 4px solid #0d9488; padding: 0.9rem; border-radius: 0 6px 6px 0; margin-top: 4px; font-size: 0.92rem; color: #134e4a;">
          <i class="fas fa-info-circle" style="margin-right: 6px;"></i> ${escapeHtml(match.remarks || 'No remarks recorded yet.')}
        </div>
      </div>

      <div style="margin-top: 1.5rem; display: flex; gap: 0.8rem; justify-content: flex-end;">
        <button class="btn-reset" onclick="window.print()" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
          <i class="fas fa-print"></i> Print Receipt
        </button>
        ${match.status === 'Resolved' ? `
          <button class="btn-submit" onclick="goToFeedback('${match.id}', '${escapeHtml(match.studentName)}')" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
            <i class="fas fa-star"></i> Leave Feedback
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function goToFeedback(complaintId, studentName) {
  navigateToView('feedbackView');
  const sel = document.getElementById('feedbackComplaintId');
  if (sel) sel.value = complaintId;
  const nameInput = document.getElementById('feedbackStudentName');
  if (nameInput) nameInput.value = studentName;
}

// ================= Feedback Form (Table 4) =================
let selectedRating = 5;

function initFeedbackForm() {
  const stars = document.querySelectorAll('#starRatingContainer i');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.getAttribute('data-star-val'));
      selectedRating = rating;
      updateStarDisplay(rating);
    });
  });

  const form = document.getElementById('feedbackForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const complaintId = document.getElementById('feedbackComplaintId').value;
      const studentName = document.getElementById('feedbackStudentName').value.trim();
      const comments = document.getElementById('feedbackComments').value.trim();

      if (!complaintId) {
        showToast('Please select a resolved complaint to rate.', 'danger');
        return;
      }
      if (!studentName || !comments) {
        showToast('Please provide your name and feedback remarks.', 'danger');
        return;
      }

      const newFeedback = {
        id: AppState.feedback.length + 1,
        complaintId,
        studentName,
        rating: selectedRating,
        comments,
        date: new Date().toISOString().split('T')[0]
      };

      if (window.supabaseService && window.supabaseService.isConnected) {
        try {
          await window.supabaseService.insertFeedback(newFeedback);
          showToast('Feedback saved to Supabase PostgreSQL database!', 'success');
        } catch (err) {
          console.warn('Supabase feedback insert error:', err);
        }
      }

      AppState.feedback.unshift(newFeedback);
      saveFeedback();
      showToast('Thank you! Your feedback has been recorded.', 'success');

      form.reset();
      selectedRating = 5;
      updateStarDisplay(5);
      renderFeedbackList();
    });
  }
}

function updateStarDisplay(rating) {
  const stars = document.querySelectorAll('#starRatingContainer i');
  stars.forEach(star => {
    const val = parseInt(star.getAttribute('data-star-val'));
    if (val <= rating) {
      star.classList.add('active-star');
      star.classList.replace('far', 'fas');
    } else {
      star.classList.remove('active-star');
      star.classList.replace('fas', 'far');
    }
  });
}

function populateResolvedDropdown() {
  const select = document.getElementById('feedbackComplaintId');
  if (!select) return;

  // Resolved complaints belonging to student or all resolved
  let resolved = AppState.complaints.filter(c => c.status === 'Resolved');
  if (AppState.currentUser && AppState.currentUser.role === 'Student') {
    const sId = (AppState.currentUser.studentId || AppState.currentUser.username).toLowerCase();
    resolved = resolved.filter(c => String(c.studentId).toLowerCase() === sId);
  }

  select.innerHTML = '<option value="">-- Select Resolved Complaint --</option>';

  resolved.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.id} - ${c.category} (${c.location})`;
    select.appendChild(opt);
  });
}

function renderFeedbackList() {
  const container = document.getElementById('feedbackCardsContainer');
  if (!container) return;

  if (AppState.feedback.length === 0) {
    container.innerHTML = '<p style="color: #64748b; font-size: 0.9rem;">No student reviews yet.</p>';
    return;
  }

  container.innerHTML = AppState.feedback.map(fb => {
    const starsHtml = '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating);
    return `
      <div class="feedback-card">
        <div class="feedback-card-header">
          <div>
            <strong>${escapeHtml(fb.studentName)}</strong>
            <span style="font-size: 0.78rem; color: #2563eb; margin-left: 6px;">[${escapeHtml(fb.complaintId)}]</span>
          </div>
          <span style="color: #f59e0b; letter-spacing: 2px;">${starsHtml}</span>
        </div>
        <p style="font-size: 0.88rem; color: #334155;">"${escapeHtml(fb.comments)}"</p>
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-top: 6px;">Submitted on: ${fb.date}</span>
      </div>
    `;
  }).join('');
}

// ================= Staff Table Render (Table 3) =================
function renderStaffList() {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;

  if (AppState.staff.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">
          <i class="fas fa-users-slash" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.4;"></i>
          No staff members registered yet. Staff members can sign up using the <strong>Sign Up</strong> portal.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = AppState.staff.map(s => {
    const activeTasks = AppState.complaints.filter(c => c.assignedStaff === s.name && c.status !== 'Resolved').length;
    return `
      <tr>
        <td><strong>${escapeHtml(s.id)}</strong></td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.department)}</td>
        <td>${escapeHtml(s.phone || '+91 98765 00000')}</td>
        <td><span class="status-pill status-in-progress">${activeTasks} Active</span></td>
        <td>
          <span class="status-pill ${activeTasks > 2 ? 'status-pending' : 'status-resolved'}">
            ● ${activeTasks > 2 ? 'Busy' : 'Available'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// ================= Supabase UI & Connection Status =================
function initSupabaseSettings() {
  const openBtn = document.getElementById('backendStatusPill');
  const modal = document.getElementById('supabaseConfigModal');
  const closeBtn = modal ? modal.querySelector('.modal-close-btn') : null;
  const form = document.getElementById('supabaseConfigForm');
  const disconnectBtn = document.getElementById('disconnectSupabaseBtn');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      document.getElementById('sbUrlInput').value = SUPABASE_CONFIG.url || '';
      document.getElementById('sbKeyInput').value = SUPABASE_CONFIG.anonKey || '';
      openModal('supabaseConfigModal');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal('supabaseConfigModal'));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = document.getElementById('sbUrlInput').value.trim();
      const key = document.getElementById('sbKeyInput').value.trim();

      if (!url || !key) {
        showToast('Please enter both Supabase URL and Anon API Key.', 'danger');
        return;
      }

      window.supabaseService.updateConfig(url, key);

      if (window.supabaseService.isConnected) {
        showToast('Connected to Supabase PostgreSQL backend successfully!', 'success');
        await loadBackendData();
        renderAll();
        closeModal('supabaseConfigModal');
      } else {
        showToast('Failed to initialize Supabase. Check the URL and Anon Key.', 'danger');
      }
    });
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      window.supabaseService.clearConfig();
      updateBackendStatusBadge(false);
      showToast('Disconnected from Supabase. Reverted to Local Storage mode.', 'info');
      closeModal('supabaseConfigModal');
    });
  }
}

function updateBackendStatusBadge(isConnected) {
  const badge = document.getElementById('backendStatusPill');
  if (!badge) return;

  if (isConnected) {
    badge.className = 'backend-pill connected';
    badge.innerHTML = '<i class="fas fa-database"></i> Supabase Live Connected';
  } else {
    badge.className = 'backend-pill local';
    badge.innerHTML = '<i class="fas fa-hdd"></i> Backend: Local / Demo (Connect Supabase)';
  }
}

// ================= Global Render & Helpers =================
function renderAll() {
  updateDashboardStats();
  renderDashboardTable();
  renderTrackStatusView();
  renderStaffList();
  renderFeedbackList();
  populateResolvedDropdown();
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active-modal');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active-modal');
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'danger') icon = 'exclamation-circle';

  toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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
