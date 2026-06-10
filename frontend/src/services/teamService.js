import api from './api';

export const teamService = {
  create: (data) => api.post('/team', data),
  listPublic: () => api.get('/team'),
  listMy: () => api.get('/team/my'),
  get: (id) => api.get(`/team/${id}`),
  join: (inviteCode) => api.post('/team/join', { invite_code: inviteCode }),
  leave: (id) => api.delete(`/team/${id}/leave`),
  disband: (id) => api.delete(`/team/${id}`),
  removeMember: (teamId, userId) => api.delete(`/team/${teamId}/members/${userId}`),
  apply: (id, message) => api.post(`/team/${id}/apply`, { message }),
  getApplications: (id) => api.get(`/team/${id}/applications`),
  handleApplication: (teamId, appId, status) => api.put(`/team/${teamId}/applications/${appId}`, { status }),
  getPosts: (id) => api.get(`/team/${id}/posts`),
  createPost: (id, content) => api.post(`/team/${id}/posts`, { content }),
  sendChatMessage: (id, content) => api.post(`/team/${id}/chat`, { content }),
  getChatHistory: (id) => api.get(`/team/${id}/chat`),
  addAward: (id, data) => api.post(`/team/${id}/awards`, data),
  deleteAward: (teamId, awardId) => api.delete(`/team/${teamId}/awards/${awardId}`),
};
