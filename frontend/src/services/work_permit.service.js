import api from '@/api/api.client';

export const WorkPermitService = {
  // Fetch all permits
  getAllPermits: async (params = {}) => {
    return await api.get('/api/work-permit', params);
  },

  // Fetch a specific permit by ID
  getPermitById: async (id) => {
    return await api.get(`/api/work-permit/${id}`);
  },

  // Stage 1: Initiate Permit
  initiatePermit: async (payload) => {
    return await api.post('/api/work-permit', payload);
  },

  // Stage 1: Update Permit (Correction)
  updateStage1: async (id, payload) => {
    return await api.put(`/api/work-permit/${id}/stage-1`, payload);
  },

  // Stage 2: Submit Electrical Review
  submitElectricalReview: async (id, payload) => {
    return await api.post(`/api/work-permit/${id}/electrical-review`, payload);
  },

  // Stage 3: Submit Acceptor Review
  submitAcceptorReview: async (id, payload) => {
    return await api.post(`/api/work-permit/${id}/acceptor-review`, payload);
  },

  // Stage 4: Approve or Forward Permit
  approvePermit: async (id, payload) => {
    return await api.post(`/api/work-permit/${id}/approve`, payload);
  },

  // Stage 5: Safety Clearance
  safetyApprove: async (id, payload) => {
    return await api.post(`/api/work-permit/${id}/safety-approve`, payload);
  }
};
