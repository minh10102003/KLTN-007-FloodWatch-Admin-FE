import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search } from 'lucide-react';
import {
  getUsers,
  assignRole,
  setUserActive,
  recomputeUserReliability,
  createUser,
  deleteUser,
} from '../services/api';
import { getCurrentUser, isAdmin } from '../utils/auth';
import { trustTierKeyFromScore } from '../utils/formatters';
import { safeRequestMessage } from '../utils/apiErrors';
import { Dialog } from '../components/ui/Dialog';
import { Modal } from '../components/ui/Modal';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '../components/ui/Menu';
import { ConfirmTypingDialog } from '../components/common/ConfirmTypingDialog';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/TableSkeleton';
import UserTable from '../components/admin/UserTable';
import { useToast } from '../components/ui/Toast';

const initialCreateForm = {
  username: '',
  email: '',
  password: '',
  role: 'moderator',
  full_name: '',
  phone: '',
};

const PAGE_SIZE = 10;

function useDebouncedValue(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function UserManagementPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const roleLabel = (r) => t(`users.roles.${r}`, { defaultValue: r });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleModal, setRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('user');
  const [recomputingId, setRecomputingId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [lockDialog, setLockDialog] = useState(null);
  const [unlockDialog, setUnlockDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteInFlightRef = useRef(false);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trustFilter, setTrustFilter] = useState('all');
  const [page, setPage] = useState(1);

  const currentUser = getCurrentUser();
  const canCreateUser = isAdmin();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers(200, 0);
      if (res.success && Array.isArray(res.data)) setUsers(res.data);
      else setUsers([]);
    } catch {
      setUsers([]);
      toast(safeRequestMessage(null, t('common.errorGeneric')), 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'locked' && u.is_active) return false;
      if (trustFilter !== 'all') {
        const key = trustTierKeyFromScore(u.reporter_reliability);
        if (key !== trustFilter) return false;
      }
      if (!q) return true;
      const blob = `${u.username || ''} ${u.email || ''} ${u.full_name || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [users, debouncedSearch, roleFilter, statusFilter, trustFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, trustFilter, users.length]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);
  const rangeLabel =
    total === 0
      ? t('users.rangeEmpty')
      : t('users.rangeShowing', { from: sliceStart + 1, to: sliceStart + pageRows.length, total });

  const handleAssignRole = async () => {
    if (!roleModal || !newRole) return;
    try {
      const res = await assignRole(roleModal.id, newRole);
      if (res.success) {
        toast(res.message || t('users.msgRoleUpdated'), 'success');
        setRoleModal(null);
        loadUsers();
      } else {
        toast(res.error || t('common.errorGeneric'), 'error');
      }
    } catch (err) {
      toast(safeRequestMessage(err, t('common.errorGeneric')), 'error');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      const res = await setUserActive(u.id, !u.is_active);
      if (res.success) {
        toast(res.message || (u.is_active ? t('users.msgLocked') : t('users.msgUnlocked')), 'success');
        loadUsers();
      } else {
        toast(res.error || res.message || t('common.errorGeneric'), 'error');
      }
    } catch (err) {
      toast(safeRequestMessage(err, t('common.errorGeneric')), 'error');
    }
  };

  const handleLockConfirm = async () => {
    if (!lockDialog) return;
    await handleToggleActive(lockDialog);
    setLockDialog(null);
  };

  const handleUnlockConfirm = async () => {
    if (!unlockDialog) return;
    await handleToggleActive(unlockDialog);
    setUnlockDialog(null);
  };

  const handleForcePasswordReset = () => {
    toast(t('users.msgPasswordResetSoon'), 'info');
  };

  const handleRecomputeReliability = async (userId) => {
    setRecomputingId(userId);
    try {
      const res = await recomputeUserReliability(userId);
      setRecomputingId(null);
      if (res?.success) {
        toast(res.message || t('users.msgReliabilityRecomputed'), 'success');
        loadUsers();
      } else {
        toast(res?.error || t('common.errorGeneric'), 'error');
      }
    } catch (err) {
      setRecomputingId(null);
      toast(safeRequestMessage(err, t('common.errorGeneric')), 'error');
    }
  };

  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
    setCreateForm(initialCreateForm);
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteDialog || deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;
    setDeleteLoading(true);
    try {
      const res = await deleteUser(deleteDialog.id);
      if (res.success) {
        toast(res.message || t('users.msgDeleted'), 'success');
        setDeleteDialog(null);
        loadUsers();
      } else {
        toast(res.error || t('common.errorGeneric'), 'error');
        if (res.status === 404) setDeleteDialog(null);
      }
    } finally {
      deleteInFlightRef.current = false;
      setDeleteLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const { username, email, password, role } = createForm;
    if (!username?.trim() || !email?.trim() || !password || !role) {
      toast(t('users.errCreateFields'), 'error');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await createUser({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        full_name: createForm.full_name?.trim() || undefined,
        phone: createForm.phone?.trim() || undefined,
      });
      if (res?.success) {
        toast(res.message || t('users.msgCreated'), 'success');
        setCreateModalOpen(false);
        setCreateForm(initialCreateForm);
        loadUsers();
      } else {
        toast(res?.error || res?.message || t('common.errorGeneric'), 'error');
      }
    } catch (err) {
      toast(safeRequestMessage(err, t('common.errorGeneric')), 'error');
    }
    setCreateLoading(false);
  };

  const selectClass =
    'rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">{t('users.title')}</h1>
        {canCreateUser && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            {t('users.createAccount')}
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('users.filterRoleAll')}</option>
            <option value="admin">{t('users.roles.admin')}</option>
            <option value="moderator">{t('users.roles.moderator')}</option>
            <option value="user">{t('users.roles.user')}</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('users.filterStatusAll')}</option>
            <option value="active">{t('users.filterActive')}</option>
            <option value="locked">{t('users.filterLocked')}</option>
          </select>
          <select value={trustFilter} onChange={(e) => setTrustFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('users.filterTrustAll')}</option>
            <option value="gold">{t('users.trustGold')}</option>
            <option value="silver">{t('users.trustSilver')}</option>
            <option value="bronze">{t('users.trustBronze')}</option>
          </select>
        </div>
      </div>

      <p className="mb-3 text-sm text-zinc-500">{rangeLabel}</p>

      {loading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : pageRows.length === 0 ? (
        <EmptyState
          title={t('users.emptyTitle')}
          description={t('users.emptyHint')}
          action={
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setStatusFilter('all');
                setTrustFilter('all');
              }}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              {t('users.clearFilters')}
            </button>
          }
        />
      ) : (
        <>
          <UserTable
            users={pageRows}
            currentUserId={currentUser?.id}
            canCreateUser={canCreateUser}
            recomputingId={recomputingId}
            onChangeRole={(u) => {
              setRoleModal(u);
              setNewRole(u.role);
            }}
            onRequestLock={(u) => setLockDialog(u)}
            onUnlock={(u) => setUnlockDialog(u)}
            onRequestDelete={(u) => setDeleteDialog(u)}
            onResetPassword={handleForcePasswordReset}
            onRecompute={handleRecomputeReliability}
          />
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-dashboard-border px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-40"
              >
                {t('users.prev')}
              </button>
              <span className="text-sm text-zinc-400">
                {t('users.pageOf', { page: safePage, totalPages })}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-dashboard-border px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-40"
              >
                {t('users.next')}
              </button>
            </div>
          )}
        </>
      )}

      {roleModal && (
        <Modal
          open={!!roleModal}
          onClose={() => setRoleModal(null)}
          title={t('users.modalChangeRole')}
          description={roleModal ? t('users.modalRoleAccount', { username: roleModal.username }) : ''}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRoleModal(null)}
                className="rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAssignRole}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                {t('common.save')}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="mb-1 block text-sm font-medium text-zinc-300">{t('users.modalRoleLabel')}</label>
            <Menu>
              <MenuTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    {roleLabel(newRole)}
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </button>
                }
              />
              <MenuPanel align="start" sideOffset={4}>
                {['user', 'moderator', 'admin'].map((r) => (
                  <MenuItem key={r} onSelect={() => setNewRole(r)}>
                    {roleLabel(r)}
                  </MenuItem>
                ))}
              </MenuPanel>
            </Menu>
          </div>
        </Modal>
      )}

      <Dialog
        open={!!lockDialog}
        onClose={() => setLockDialog(null)}
        onConfirm={handleLockConfirm}
        title={t('users.lockTitle')}
        description={
          lockDialog ? (
            <p className="text-zinc-300">
              {t('users.lockDesc', { username: lockDialog.username })}
            </p>
          ) : null
        }
        confirmLabel={t('users.lockConfirm')}
        variant="destructive"
      />

      <Dialog
        open={!!unlockDialog}
        onClose={() => setUnlockDialog(null)}
        onConfirm={handleUnlockConfirm}
        title={t('users.unlockTitle')}
        description={
          unlockDialog ? (
            <p className="text-zinc-300">
              {t('users.unlockDesc', { username: unlockDialog.username })}
            </p>
          ) : null
        }
        confirmLabel={t('users.unlockConfirm')}
        variant="default"
      />

      <ConfirmTypingDialog
        open={!!deleteDialog}
        onClose={() => !deleteLoading && setDeleteDialog(null)}
        onConfirm={handleDeleteUserConfirm}
        title={t('users.deleteTitle')}
        description={t('users.deleteDesc')}
        confirmPhrase={deleteDialog?.username || ''}
        confirmLabel={t('users.deleteConfirm')}
        loading={deleteLoading}
      />

      {createModalOpen && (
        <Modal
          open={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
          }}
          title={t('users.modalCreateTitle')}
          description={t('users.modalCreateDesc')}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setCreateModalOpen(false);
                }}
                className="rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                form="create-user-form"
                disabled={createLoading}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {createLoading ? t('users.creating') : t('users.createAccount')}
              </button>
            </>
          }
        >
          <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('users.labelUsername')}</label>
              <input
                type="text"
                value={createForm.username}
                onChange={(e) => {
                  setCreateForm((f) => ({ ...f, username: e.target.value }));
                }}
                className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('users.labelEmail')}</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => {
                  setCreateForm((f) => ({ ...f, email: e.target.value }));
                }}
                className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('users.labelPassword')}</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => {
                  setCreateForm((f) => ({ ...f, password: e.target.value }));
                }}
                className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('users.labelRole')}</label>
              <Menu>
                <MenuTrigger
                  render={
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    >
                      {roleLabel(createForm.role)}
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    </button>
                  }
                />
                <MenuPanel className="min-w-[10rem]" align="start" sideOffset={4}>
                  {['user', 'moderator', 'admin'].map((r) => (
                    <MenuItem key={r} onSelect={() => setCreateForm((f) => ({ ...f, role: r }))}>
                      {roleLabel(r)}
                    </MenuItem>
                  ))}
                </MenuPanel>
              </Menu>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('users.labelFullName')}</label>
              <input
                type="text"
                value={createForm.full_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('users.labelPhone')}</label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
