import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const passService = {
  // Create a new gate pass
  createPass: async (passData) => {
    const response = await api.post('/passes', passData);
    return response.data.data;
  },

  // Get user's passes with filters
  getUserPasses: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });

    const response = await api.get(`/passes?${queryParams.toString()}`);
    return response.data.data;
  },

  // Get pass by ID
  getPassById: async (passId) => {
    const response = await api.get(`/passes/${passId}`);
    return response.data.data;
  },

  // Update pass (for students - only if pending)
  updatePass: async (passId, passData) => {
    const response = await api.put(`/passes/${passId}`, passData);
    return response.data.data;
  },

  // Cancel pass
  cancelPass: async (passId, reason) => {
    const response = await api.patch(`/passes/${passId}/cancel`, { reason });
    return response.data.data;
  },

  // Approve pass (for mentors/HODs)
  approvePass: async (passId, approvalData) => {
    const response = await api.patch(`/passes/${passId}/approve`, approvalData);
    return response.data.data;
  },

  // Reject pass (for mentors/HODs)
  rejectPass: async (passId, rejectionData) => {
    const response = await api.patch(`/passes/${passId}/reject`, rejectionData);
    return response.data.data;
  },

  // Get passes for approval (for mentors/HODs)
  getPassesForApproval: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });

    const response = await api.get(`/passes/for-approval?${queryParams.toString()}`);
    return response.data.data;
  },

  // Check out (for security)
  checkOut: async (passId, securityData) => {
    const response = await api.patch(`/passes/${passId}/checkout`, securityData);
    return response.data.data;
  },

  // Check in (for security)
  checkIn: async (passId, securityData) => {
    const response = await api.patch(`/passes/${passId}/checkin`, securityData);
    return response.data.data;
  },

  // Verify pass by QR code (for security)
  verifyPassByQR: async (qrToken) => {
    const response = await api.get(`/passes/verify/${qrToken}`);
    return response.data.data;
  },

  // Verify QR code (enhanced method)
  verifyQRCode: async (qrData, action = 'exit') => {
    try {
      const response = await api.post('/passes/verify', {
        qrData,
        action,
        timestamp: new Date().toISOString()
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        error: error.response?.data?.error || 'Verification failed'
      };
    }
  },

  // Get QR code for pass
  getPassQRCode: async (passId) => {
    const response = await api.get(`/passes/${passId}/qr`);
    return response.data.data;
  },

  // Get pass statistics
  getPassStatistics: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });

    const response = await api.get(`/passes/statistics?${queryParams.toString()}`);
    return response.data.data;
  },

  // Download pass as PDF
  downloadPassPDF: async (passId) => {
    const response = await api.get(`/passes/${passId}/pdf`, {
      responseType: 'blob',
    });
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gate-pass-${passId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Get pass history
  getPassHistory: async (passId) => {
    const response = await api.get(`/passes/${passId}/history`);
    return response.data.data;
  },

  // Bulk approve passes (for HODs)
  bulkApprove: async (passIds, approvalData) => {
    const response = await api.post('/passes/bulk-approve', {
      passIds,
      ...approvalData,
    });
    return response.data.data;
  },

  // Get pending passes count
  getPendingCount: async () => {
    const response = await api.get('/passes/pending-count');
    return response.data.data;
  },

  // Get active passes for today
  getActivePasses: async () => {
    const response = await api.get('/passes/active');
    return response.data.data;
  },
};

export default passService;