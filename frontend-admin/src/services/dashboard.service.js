import axiosClient from './axiosClient';

const getLowStock = async (limit = 5) => {
  const res = await axiosClient.get(`/products/low-stock?limit=${limit}`);
  return res.data;
};

export default { getLowStock };
