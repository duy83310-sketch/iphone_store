import axiosClient from './axiosClient';

export async function fetchClients({ page = 1, limit = 10, q = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (q) params.set('q', q);
  const res = await axiosClient.get(`/admin/users/clients?${params.toString()}`);
  return res.data; // { data, total, page, limit }
}

export default { fetchClients };
