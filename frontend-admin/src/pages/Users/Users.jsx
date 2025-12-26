import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import axiosClient from '../../services/axiosClient';
import { createStaff } from '../../services/users.service';
import { isAdmin } from '../../utils/auth';

export default function Users() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // New: list UI states
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Keep a verified admin state that will be set after checking /auth/me on mount
  const [adminVerified, setAdminVerified] = useState(isAdmin());
  const [checking, setChecking] = useState(false);

  // { changed code } edit modal states
  const [showEdit, setShowEdit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editNewPassword, setEditNewPassword] = useState('');

  useEffect(() => {
    // Always verify role on mount (don't rely on possibly stale localStorage)
    let mounted = true;
    const checkRole = async () => {
      setChecking(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (mounted) setAdminVerified(false);
          return;
        }

        const res = await axiosClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        // server returns user object
        const role = res.data?.role || res.data?.user?.role;
        if (role && String(role).toLowerCase() === 'admin') {
          localStorage.setItem('userRole', 'admin');
          if (mounted) setAdminVerified(true);
        } else {
          localStorage.removeItem('userRole');
          if (mounted) setAdminVerified(false);
        }
      } catch (err) {
        console.error('checkRole', err?.response?.data || err.message);
        // on failure, keep adminVerified false
        localStorage.removeItem('userRole');
        if (mounted) setAdminVerified(false);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkRole();
    return () => { mounted = false; };
  }, []);

  // New: fetch users list (debounced by query/role)
  const fetchUsers = async ({ silent = false } = {}) => {
    if (!silent) setLoadingUsers(true);
    try {
      const params = {};
      if (query.trim()) params.q = query.trim();

      // Only staff for this page
      const res = await axiosClient.get('/admin/users/staff', { params });

      const list = res?.data?.users ?? res?.data?.data ?? res?.data ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('fetchUsers', err?.response?.data || err.message);
      if (!silent) toast.error('Không thể tải danh sách nhân viên');
      setUsers([]);
    } finally {
      if (!silent) setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!adminVerified) return;
    let t = setTimeout(() => fetchUsers(), 350);
    return () => clearTimeout(t);
  }, [adminVerified, query]);

  const columns = useMemo(() => ([
    { key: 'name', label: 'Tên' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Vai trò' },
    // { changed code } show status for edit visibility
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Hành động' }
  ]), []);

  if (checking) return (
    <div style={{ padding: 20 }}>
      <h3>Đang kiểm tra quyền...</h3>
    </div>
  );

  if (!adminVerified) return (
    <div style={{ padding: 20 }}>
      <h3>Không có quyền truy cập</h3>
      <p>Bạn cần quyền <strong>admin</strong> để truy cập trang này.</p>
    </div>
  );

  const handleCreate = async () => {
    try {
      setLoading(true);

      // Basic client-side validation
      if (!name || !email || !password) {
        toast.error('Vui lòng điền đầy đủ thông tin');
        setLoading(false);
        return;
      }

      if (typeof password !== 'string' || password.length < 6) {
        toast.error('Mật khẩu phải có ít nhất 6 ký tự');
        setLoading(false);
        return;
      }

      const emailRe = /^[^@]+@[^@]+\.[^@]+$/;
      if (!emailRe.test(String(email).toLowerCase())) {
        toast.error('Email không hợp lệ');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Vui lòng đăng nhập lại (token không tìm thấy)');
        setLoading(false);
        return;
      }

      const res = await createStaff({ name, email, password });
      toast.success(res?.msg || 'Tạo nhân viên thành công');
      setName(''); setEmail(''); setPassword('');
      setShowCreate(false);
      fetchUsers({ silent: true });
    } catch (err) {
      console.error('createStaff', err);
      // Show server message when available
      const serverMsg = err?.response?.data?.msg || err?.message || 'Không thể tạo nhân viên';
      toast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u) => {
    if (!u) return;
    setEditingUser(u);
    setEditName(u?.name || '');
    setEditEmail(u?.email || '');
    setEditPhone(u?.phone || '');
    setEditStatus(u?.status || 'active');
    setEditNewPassword('');
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    try {
      const id = editingUser?.id || editingUser?._id;
      if (!id) {
        toast.error('Không tìm thấy id nhân viên');
        return;
      }

      // basic validation
      if (!editName.trim() || !editEmail.trim()) {
        toast.error('Vui lòng điền tên và email');
        return;
      }

      const emailRe = /^[^@]+@[^@]+\.[^@]+$/;
      if (!emailRe.test(String(editEmail).toLowerCase())) {
        toast.error('Email không hợp lệ');
        return;
      }

      if (editNewPassword && editNewPassword.length < 6) {
        toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
        return;
      }

      if (!['active', 'disabled'].includes(String(editStatus))) {
        toast.error('Trạng thái không hợp lệ');
        return;
      }

      const payload = {
        name: editName.trim(),
        email: String(editEmail).trim(),
        phone: editPhone.trim(),
        status: editStatus
      };
      if (editNewPassword) payload.newPassword = editNewPassword;

      await axiosClient.patch(`/admin/users/staff/${id}`, payload);

      toast.success('Cập nhật nhân viên thành công');
      setShowEdit(false);
      setEditingUser(null);
      fetchUsers({ silent: true });
    } catch (err) {
      console.error('updateStaff', err);
      toast.error(err?.response?.data?.msg || err?.message || 'Không thể cập nhật nhân viên');
    }
  };

  // { changed code } delete handler
  const handleDelete = async (u) => {
    try {
      const id = u?.id || u?._id;
      if (!id) return toast.error('Không tìm thấy id nhân viên');

      const ok = window.confirm(`Xóa nhân viên "${u?.name || u?.email || id}"? Hành động này không thể hoàn tác.`);
      if (!ok) return;

      const token = localStorage.getItem('token');
      await axiosClient.delete(`/admin/users/staff/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      toast.success('Xóa nhân viên thành công');
      fetchUsers({ silent: true });
    } catch (err) {
      console.error('deleteStaff', err);
      toast.error(err?.response?.data?.msg || err?.message || 'Không thể xóa nhân viên');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Quản lý người dùng</h2>
          <div style={{ color: '#94a3b8', marginTop: 6 }}>Xem, thêm, sửa, và phân quyền người dùng.</div>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          style={{ ...btnStyle, padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          + Thêm nhân viên
        </button>
      </div>

      {/* List card */}
      <section style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 260 }}>
            <input
              placeholder="Tìm theo tên / email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ ...inputStyle, maxWidth: 520 }}
            />

            {/* removed role filter: this page lists only staff */}
          </div>

          <button onClick={() => fetchUsers()} disabled={loadingUsers} style={{ ...btnStyle, background: '#0ea5e9' }}>
            {loadingUsers ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>

        <div style={{ marginTop: 14, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0' }}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      textAlign: 'left',
                      fontSize: 12,
                      color: '#94a3b8',
                      fontWeight: 600,
                      padding: '10px 8px',
                      borderBottom: '1px solid rgba(148,163,184,.18)'
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loadingUsers && users.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ padding: 14, color: '#94a3b8' }}>
                    Không có dữ liệu.
                  </td>
                </tr>
              )}

              {users.map((u) => (
                <tr key={u?._id || u?.id || `${u?.email}-${u?.name}`}>
                  <td style={tdStyle}>{u?.name || '-'}</td>
                  <td style={tdStyle}>{u?.email || '-'}</td>
                  <td style={tdStyle}>{u?.role || '-'}</td>
                  {/* { changed code } */}
                  <td style={tdStyle}>{u?.status || 'active'}</td>
                  <td style={tdStyle}>
                    <button style={iconBtnStyle} onClick={() => openEdit(u)}>Sửa</button>
                    {/* { changed code } */}
                    <button
                      style={{ ...iconBtnStyle, color: '#f87171' }}
                      onClick={() => handleDelete(u)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create modal (current UI moved here) */}
      {showCreate && (
        <div style={modalOverlayStyle} onMouseDown={() => setShowCreate(false)}>
          <div style={modalStyle} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff' }}>Thêm nhân viên</h3>
                <div style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>
                  Tạo tài khoản nhân viên (staff)
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ ...btnStyle, background: '#334155' }}>Đóng</button>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Tên" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              <input placeholder="Mật khẩu" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setName(''); setEmail(''); setPassword(''); }}
                  style={{ ...btnStyle, background: '#64748b' }}
                  disabled={loading}
                >
                  Hoàn tác
                </button>
                <button onClick={handleCreate} disabled={loading} style={btnStyle}>
                  {loading ? 'Đang tạo...' : 'Tạo nhân viên'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* { changed code } Edit modal */}
      {showEdit && (
        <div style={modalOverlayStyle} onMouseDown={() => setShowEdit(false)}>
          <div style={modalStyle} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff' }}>Sửa nhân viên</h3>
                <div style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>
                  Cập nhật thông tin nhân viên (staff)
                </div>
              </div>
              <button onClick={() => setShowEdit(false)} style={{ ...btnStyle, background: '#334155' }}>Đóng</button>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Tên" value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
              <input placeholder="Email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={inputStyle} />
              <input placeholder="Số điện thoại" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={inputStyle} />

              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={inputStyle}>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>

              <input
                placeholder="Mật khẩu mới (để trống nếu không đổi)"
                type="password"
                value={editNewPassword}
                onChange={e => setEditNewPassword(e.target.value)}
                style={inputStyle}
              />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    // reset fields back to original
                    openEdit(editingUser);
                  }}
                  style={{ ...btnStyle, background: '#64748b' }}
                >
                  Hoàn tác
                </button>
                <button onClick={handleUpdate} style={btnStyle}>
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const inputStyle = {
  padding: 10,
  borderRadius: 6,
  border: '1px solid rgba(148,163,184,.18)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  background: '#0b1220',
  color: '#e2e8f0'
};

const btnStyle = {
  padding: '8px 12px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
};

// New: shared styles
const cardStyle = {
  background: '#0f1a2b',
  padding: 16,
  borderRadius: 10,
  color: '#fff',
  border: '1px solid rgba(148,163,184,.12)'
};

const tdStyle = {
  padding: '12px 8px',
  borderBottom: '1px solid rgba(148,163,184,.12)',
  color: '#e2e8f0',
  fontSize: 14
};

const iconBtnStyle = {
  ...btnStyle,
  background: 'transparent',
  border: '1px solid rgba(148,163,184,.22)',
  color: '#93c5fd',
  padding: '6px 10px',
  marginRight: 8
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 50
};

const modalStyle = {
  width: '100%',
  maxWidth: 640,
  background: '#0f1a2b',
  border: '1px solid rgba(148,163,184,.18)',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,.35)'
};
