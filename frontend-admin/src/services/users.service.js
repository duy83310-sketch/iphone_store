import axiosClient from './axiosClient';

export async function createStaff({ name, email, password }) {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  const res = await axiosClient.post('/admin/users/staff', { name, email, password }, { headers });
  return res.data;
}
