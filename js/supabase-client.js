/**
 * Supabase Backend Client Integration
 * Online Smart Campus Maintenance & Complaint Tracking System
 */

// Connected Supabase Project Credentials
const SUPABASE_CONFIG = {
  url: localStorage.getItem('cmts_sb_url') || 'https://tgdektiaeqzkhntxtbmf.supabase.co',
  anonKey: localStorage.getItem('cmts_sb_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZGVrdGlhZXF6a2hudHh0Ym1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMzI3OTksImV4cCI6MjEwOTgwODc5OX0.fdnNzVy1WLDriNFhjOXN--zDieyEETk_TOjO66Zgs5g'
};

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.init();
  }

  init() {
    if (localStorage.getItem('cmts_sb_disabled') === 'true') {
      this.isConnected = false;
      return;
    }
    if (window.supabase && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
      try {
        this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        this.isConnected = true;
        console.log('✅ Supabase Client initialized with project:', SUPABASE_CONFIG.url);
      } catch (err) {
        console.warn('⚠️ Supabase initialization failed:', err);
        this.isConnected = false;
      }
    } else {
      this.isConnected = false;
    }
  }

  updateConfig(url, anonKey) {
    SUPABASE_CONFIG.url = url.trim();
    SUPABASE_CONFIG.anonKey = anonKey.trim();
    localStorage.removeItem('cmts_sb_disabled');
    localStorage.setItem('cmts_sb_url', SUPABASE_CONFIG.url);
    localStorage.setItem('cmts_sb_key', SUPABASE_CONFIG.anonKey);
    this.init();
  }

  clearConfig() {
    SUPABASE_CONFIG.url = '';
    SUPABASE_CONFIG.anonKey = '';
    localStorage.setItem('cmts_sb_disabled', 'true');
    localStorage.removeItem('cmts_sb_url');
    localStorage.removeItem('cmts_sb_key');
    this.client = null;
    this.isConnected = false;
  }

  // --- Complaints Data Access ---
  async getComplaints(fallbackList) {
    if (!this.isConnected) return fallbackList;
    try {
      const { data, error } = await this.client
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map postgres snake_case to frontend camelCase
      return data.map(c => ({
        id: c.id,
        studentName: c.student_name,
        studentId: c.student_id,
        location: c.location,
        category: c.category,
        date: c.date,
        description: c.description,
        assignedStaff: c.assigned_staff || 'Unassigned',
        status: c.status || 'Pending',
        remarks: c.remarks || '',
        createdAt: c.created_at
      }));
    } catch (err) {
      console.error('Error fetching complaints from Supabase:', err);
      return fallbackList;
    }
  }

  async insertComplaint(c) {
    if (!this.isConnected) return null;
    try {
      const payload = {
        id: c.id,
        student_name: c.studentName,
        student_id: c.studentId,
        location: c.location,
        category: c.category,
        date: c.date,
        description: c.description,
        assigned_staff: c.assignedStaff,
        status: c.status,
        remarks: c.remarks
      };
      const { data, error } = await this.client.from('complaints').insert([payload]).select();
      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error('Error inserting complaint to Supabase:', err);
      throw err;
    }
  }

  async updateComplaint(id, updates) {
    if (!this.isConnected) return null;
    try {
      const payload = {};
      if (updates.assignedStaff !== undefined) payload.assigned_staff = updates.assignedStaff;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.remarks !== undefined) payload.remarks = updates.remarks;

      const { data, error } = await this.client
        .from('complaints')
        .update(payload)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error('Error updating complaint in Supabase:', err);
      throw err;
    }
  }

  // --- Staff Data Access ---
  async getStaff(fallbackList) {
    if (!this.isConnected) return fallbackList;
    try {
      const { data, error } = await this.client.from('staff').select('*');
      if (error) throw error;
      return data.map(s => ({
        id: s.id,
        name: s.name,
        department: s.department,
        phone: s.phone,
        activeTasks: s.active_tasks || 0,
        status: s.status || 'Available'
      }));
    } catch (err) {
      console.error('Error fetching staff from Supabase:', err);
      return fallbackList;
    }
  }

  // --- Feedback Data Access ---
  async getFeedback(fallbackList) {
    if (!this.isConnected) return fallbackList;
    try {
      const { data, error } = await this.client
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(f => ({
        id: f.id,
        complaintId: f.complaint_id,
        studentName: f.student_name,
        rating: f.rating,
        comments: f.comments,
        date: f.date
      }));
    } catch (err) {
      console.error('Error fetching feedback from Supabase:', err);
      return fallbackList;
    }
  }

  async insertFeedback(f) {
    if (!this.isConnected) return null;
    try {
      const payload = {
        complaint_id: f.complaintId,
        student_name: f.studentName,
        rating: f.rating,
        comments: f.comments,
        date: f.date
      };
      const { data, error } = await this.client.from('feedback').insert([payload]).select();
      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error('Error inserting feedback to Supabase:', err);
      throw err;
    }
  }

  // --- Users Data Access ---
  async getUsers(fallbackList) {
    if (!this.isConnected) return fallbackList;
    try {
      const { data, error } = await this.client.from('users').select('*');
      if (error) throw error;
      return data.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        role: u.role,
        name: u.name,
        email: u.email,
        studentId: u.student_or_staff_id,
        staffId: u.student_or_staff_id,
        dept: u.department
      }));
    } catch (err) {
      console.error('Error fetching users from Supabase:', err);
      return fallbackList;
    }
  }

  async insertUser(u) {
    if (!this.isConnected) return null;
    try {
      const payload = {
        username: u.username,
        password: u.password,
        role: u.role,
        name: u.name,
        email: u.email || `${u.username}@campus.edu`,
        student_or_staff_id: u.studentId || u.staffId || u.username,
        department: u.dept || 'General'
      };
      const { data, error } = await this.client.from('users').insert([payload]).select();
      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error('Error inserting user to Supabase:', err);
      throw err;
    }
  }

  async insertStaff(s) {
    if (!this.isConnected) return null;
    try {
      const payload = {
        id: s.id,
        name: s.name,
        department: s.department,
        phone: s.phone || 'N/A',
        active_tasks: 0,
        status: 'Available'
      };
      const { data, error } = await this.client.from('staff').insert([payload]).select();
      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error('Error inserting staff to Supabase:', err);
      throw err;
    }
  }

  // --- Real-time Subscription ---
  subscribeToChanges(onChangeCallback) {
    if (!this.isConnected || !this.client) return null;
    try {
      const channel = this.client
        .channel('public:complaints_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, payload => {
          console.log('⚡ Realtime Supabase Complaint Update received:', payload);
          if (onChangeCallback) onChangeCallback(payload);
        })
        .subscribe();
      return channel;
    } catch (err) {
      console.warn('Realtime subscription not supported or failed:', err);
      return null;
    }
  }
}

// Global instance
window.supabaseService = new SupabaseService();

