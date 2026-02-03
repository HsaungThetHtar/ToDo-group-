import React, { useState, useEffect } from "react";
import { api } from "../api/api"; // Add this import

// Format datetime for display
const formatDateTime = (dateString) => {
  if (!dateString) return "No deadline";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Check if datetime is overdue
const isOverdue = (dateString) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

function TodoList({ username, onLogout, onGoToProfile }) {
  const [todos, setTodos] = useState([]);
  const [teams, setTeams] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [targetDatetime, setTargetDatetime] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  const currentUserObj = JSON.parse(localStorage.getItem('user') || 'null');
  const currentUserId = currentUserObj?.id || null;

  useEffect(() => {
    fetchTeams();
    fetchProfile();
  }, [username]);

  // Add this function to fetch profile
  const fetchProfile = async () => {
    try {
      const data = await api.getProfile(username);
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // Fetch teams for logged-in user
  const fetchTeams = async () => {
    try {
      const data = await api.getTeams();
      // data: [{id, name, created_by, is_admin}]
      const teamsWithTasks = await Promise.all(data.map(async (t) => {
        const tasks = await api.getTeamTasks(t.id);
        return { ...t, tasks };
      }));
      setTeams(teamsWithTasks);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err.message || 'Failed to fetch teams');
      if (err.message && err.message.includes('token')) onLogout();
    }
  };

  // Create a team task (admin only)
  const handleCreateTeamTask = async (teamId, title, assignee_id, targetDatetime) => {
    setError("");
    if (!title || !targetDatetime) {
      setError('Title and deadline required');
      return;
    }

    try {
      const resp = await api.createTeamTask(teamId, title, '', assignee_id || null, targetDatetime);
      // Refresh team tasks
      await fetchTeams();
      return resp;
    } catch (err) {
      console.error('Error creating team task', err);
      setError(err.message || 'Failed to create task');
    }
  };

  // Update team task (status or deadline) - only admin or assignee allowed by server
  const handleTeamTaskUpdate = async (teamId, taskId, updates) => {
    try {
      await api.updateTeamTask(teamId, taskId, updates);
      await fetchTeams();
    } catch (err) {
      console.error('Error updating task', err);
      setError(err.message || 'Failed to update task');
    }
  };

  // Delete personal todo (legacy)
  const handleDeleteTodo = async (id) => {
    try {
      await api.deleteTodo(id);
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // SORT & GROUP
  const sortDesc = (a, b) =>
    new Date(b.targetDatetime) - new Date(a.targetDatetime);

  const todoList = todos
    .filter((t) => t.status === "Todo")
    .sort(sortDesc);

  const doingList = todos
    .filter((t) => t.status === "Doing")
    .sort(sortDesc);

  const doneList = todos
    .filter((t) => t.status === "Done")
    .sort(sortDesc);

  return (
  <div className="max-w-6xl mx-auto">
    {/* Header */}
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Welcome, <span className="text-blue-600">{username}</span>
        </h2>
        <p className="text-sm text-gray-500">Manage your tasks efficiently</p>
      </div>

      {/* Profile Picture & Logout */}
      <div className="flex items-center gap-4">
        {profile && profile.profile_image && (
          <img 
            src={profile.profile_image.startsWith('http') ? profile.profile_image : `http://localhost:5001${profile.profile_image}`}
            alt={profile.full_name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-400 ring-offset-2 cursor-pointer hover:ring-blue-600 hover:ring-4 transition-all"
            onClick={onGoToProfile}
            onError={(e) => {
              console.error('Profile image failed to load:', profile.profile_image);
              e.target.style.display = 'none';
            }}
          />
        )}

        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </div>

    {/* Error Message */}
    {error && (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    )}

    {/* Always show create team form */}
    <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Create a new team</h3>
      <CreateTeamForm onCreated={() => fetchTeams()} />
    </div>

    {/* Existing teams */}
    {teams.map((team) => (
      <div key={team.id} className="mb-8 bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{team.name}</h3>
              {team.is_admin === 1 && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-semibold">Admin</span>}
            </div>
            <p className="text-sm text-gray-500">{team.tasks.length} tasks</p>
          </div>
          <div className="flex items-center gap-3">
            {team.is_admin === 1 ? (
              <AddTeamTaskForm teamId={team.id} onCreate={() => fetchTeams()} />
            ) : (
              <span className="text-sm text-gray-500">Team member</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TeamTaskColumn team={team} status="Todo" onUpdate={handleTeamTaskUpdate} currentUserId={currentUserId} />
          <TeamTaskColumn team={team} status="Doing" onUpdate={handleTeamTaskUpdate} currentUserId={currentUserId} />
          <TeamTaskColumn team={team} status="Done" onUpdate={handleTeamTaskUpdate} currentUserId={currentUserId} />
        </div>

        {/* Members section (visible to admins) - compact */}
        {team.is_admin === 1 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <TeamMembersManager teamId={team.id} onUpdate={() => fetchTeams()} />
          </div>
        )}
      </div>
    ))}

    {/* (Personal todos removed — teams UI above is primary) */}
  </div>
);
}

// Column Component
function TaskColumn({ title, color, list, onStatusChange, onDelete }) {
  const colorMap = {
    yellow: "bg-yellow-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className={`${colorMap[color]} px-4 py-3`}>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-white text-sm">{list.length} tasks</p>
      </div>

      <ul className="divide-y max-h-96 overflow-y-auto">
        {list.length === 0 ? (
          <li className="px-4 py-8 text-center text-gray-400">
            No tasks
          </li>
        ) : (
          list.map((todo) => (
            <TaskCard
              key={todo.id}
              todo={todo}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))
        )}
      </ul>
    </div>
  );
}

// Task Card
function TaskCard({ todo, onStatusChange, onDelete }) {
  const overdue = isOverdue(todo.targetDatetime);
  const isDone = todo.status === "Done";

  return (
    <li className={`px-4 py-4 hover:bg-gray-50 transition ${isDone ? "bg-gray-100" : ""}`}>
      <div className="space-y-2">
        <div className="flex justify-between gap-2">
          <p className={`font-medium flex-1 ${isDone ? "line-through text-gray-500" : "text-gray-800"}`}>
            {todo.task}
          </p>
          <button
            onClick={() => onDelete(todo.id)}
            className="text-gray-400 hover:text-red-500 transition"
          >
            🗑️
          </button>
        </div>

        <div className={`text-xs flex items-center gap-1 ${
          overdue && !isDone ? "text-red-600" : "text-gray-600"
        }`}>
          🕐 {formatDateTime(todo.targetDatetime)}
          {overdue && !isDone && <span className="ml-1">Overdue!</span>}
        </div>

        <select
          value={todo.status}
          onChange={(e) => onStatusChange(todo.id, e.target.value)}
          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="Todo">📋 Todo</option>
          <option value="Doing">⚙️ Doing</option>
          <option value="Done">✅ Done</option>
        </select>
      </div>
    </li>
  );
}

// Create Team Form
function CreateTeamForm({ onCreated }) {
  const [name, setName] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await api.getUsers();
        if (mounted) setAvailableUsers(users);
      } catch (err) {
        console.error('Failed to load users for team creation', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.createTeam(name, selectedMembers.length ? selectedMembers : undefined);
      setName(''); setSelectedMembers([]); setFilter('');
      onCreated && onCreated();
    } catch (err) {
      console.error('Create team failed', err);
      alert(err.message || 'Failed to create team');
    } finally { setLoading(false); }
  };

  const visibleUsers = availableUsers.filter(u => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (u.username && u.username.toLowerCase().includes(q)) || (u.full_name && u.full_name.toLowerCase().includes(q));
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Team name" className="w-full p-2 border rounded" />

      <label className="block text-sm text-gray-600">Add members</label>
      <input placeholder="Search users..." value={filter} onChange={e=>setFilter(e.target.value)} className="w-full p-2 border rounded mb-2" />

      <div className="border rounded h-40 overflow-y-auto p-2">
        {visibleUsers.length === 0 ? (
          <div className="text-sm text-gray-500">No users found</div>
        ) : (
          visibleUsers.map(u => (
            <label key={u.id} className="flex items-center gap-2 py-1">
              <input type="checkbox" checked={selectedMembers.includes(u.id)} onChange={() => toggleMember(u.id)} />
              <span className="text-sm">{u.username}{u.full_name ? ` — ${u.full_name}` : ''}</span>
            </label>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <button className="px-4 py-2 bg-green-600 text-white rounded" type="submit" disabled={loading}>{loading? 'Creating...':'Create Team'}</button>
      </div>
    </form>
  );
}

// Add Task form shown to team admin
function AddTeamTaskForm({ teamId, onCreate }) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const members = await api.getTeamMembers(teamId);
        if (mounted) setAvailableMembers(members);
      } catch (err) {
        console.error('Failed to load team members for assignee dropdown', err);
      }
    })();
    return () => { mounted = false; };
  }, [teamId]);

  const submit = async (e) => {
    e && e.preventDefault();
    if (!title || !target) return alert('Title and deadline required');
    setLoading(true);
    try {
      await api.createTeamTask(teamId, title, '', assignee ? Number(assignee) : null, target);
      setTitle(''); setAssignee(''); setTarget('');
      onCreate && onCreate();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to create task');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex gap-2 items-center">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task title" className="px-3 py-1 border rounded" />

      <select value={assignee} onChange={e=>setAssignee(e.target.value)} className="w-36 px-3 py-1 border rounded">
        <option value="">Unassigned</option>
        {availableMembers.map(u => (
          <option key={u.id} value={u.id}>{u.username}{u.full_name ? ` — ${u.full_name}` : ''}</option>
        ))}
      </select>

      <input type="datetime-local" value={target} onChange={e=>setTarget(e.target.value)} className="px-3 py-1 border rounded" />
      <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded" disabled={loading}>{loading? 'Adding':'Add'}</button>
    </form>
  );
}

// Team Task Column
function TeamTaskColumn({ team, status, onUpdate, currentUserId }) {
  const tasks = (team.tasks || []).filter(t => t.status === status);
  
  const colorMap = {
    'Todo': 'bg-yellow-500',
    'Doing': 'bg-blue-500',
    'Done': 'bg-green-500',
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className={`px-4 py-3 ${colorMap[status]}`}>
        <h3 className="text-lg font-bold text-white">{status}</h3>
        <p className="text-white text-sm">{tasks.length} tasks</p>
      </div>

      <ul className="divide-y max-h-96 overflow-y-auto">
        {tasks.length === 0 ? (
          <li className="px-4 py-8 text-center text-gray-400">No tasks</li>
        ) : tasks.map(task => (
          <TeamTaskCard key={task.id} task={task} team={team} onUpdate={onUpdate} currentUserId={currentUserId} />
        ))}
      </ul>
    </div>
  );
}

function TeamTaskCard({ task, team, onUpdate, currentUserId }) {
  const overdue = isOverdue(task.target_datetime || task.targetDatetime);
  const canEdit = team.is_admin || (task.assignee_id && task.assignee_id === currentUserId);

  const handleStatus = (newStatus) => {
    onUpdate(team.id, task.id, { status: newStatus });
  };

  return (
    <li className={`px-4 py-4 hover:bg-gray-50 transition`}>
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">{task.title || task.title}</p>
            <div className="text-xs text-gray-600">Assignee: {task.assignee_username || task.assignee_id || 'Unassigned'}</div>
          </div>
          <div className="text-xs text-gray-500">{formatDateTime(task.target_datetime || task.targetDatetime)}</div>
        </div>

        <div className={`text-xs ${overdue ? 'text-red-600' : 'text-gray-600'}`}>{overdue ? 'Overdue' : ''}</div>

        <select value={task.status} onChange={(e)=> canEdit ? handleStatus(e.target.value) : null} disabled={!canEdit} className="w-full px-3 py-1.5 text-sm border rounded-lg">
          <option value="Todo">📋 Todo</option>
          <option value="Doing">⚙️ Doing</option>
          <option value="Done">✅ Done</option>
        </select>
      </div>
    </li>
  );
}

// Team Members Manager
function TeamMembersManager({ teamId, onUpdate }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMemberId, setNewMemberId] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    fetchMembers();
    fetchAllUsers();
  }, [teamId]);

  const fetchMembers = async () => {
    try {
      const data = await api.getTeamMembers(teamId);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberId) return;
    try {
      await api.addTeamMember(teamId, Number(newMemberId));
      setNewMemberId('');
      await fetchMembers();
      onUpdate && onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await api.removeTeamMember(teamId, userId);
      await fetchMembers();
      onUpdate && onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const memberIds = new Set(members.map(m => m.id));
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));
  const sortedMembers = [...members].sort((a, b) => (b.is_admin === 1 ? 1 : 0) - (a.is_admin === 1 ? 1 : 0));

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2 text-sm">Team Members ({members.length})</h4>
      
      {/* Members List */}
      <div className="mb-3 space-y-1">
        {sortedMembers.map(m => (
          <div key={m.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div>
              <span className="text-sm font-medium">{m.username}</span>
              {m.full_name && <span className="text-xs text-gray-500"> — {m.full_name}</span>}
              {(m.is_admin === 1 || m.is_admin === true) && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1 rounded">Admin</span>}
            </div>
            <button
              onClick={() => handleRemoveMember(m.id)}
              className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Add Member Form */}
      {availableUsers.length > 0 && (
        <form onSubmit={handleAddMember} className="flex gap-2">
          <select
            value={newMemberId}
            onChange={(e) => setNewMemberId(e.target.value)}
            className="flex-1 px-2 py-1 border rounded text-sm"
          >
            <option value="">Select user to add...</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.username}{u.full_name ? ` — ${u.full_name}` : ''}
              </option>
            ))}
          </select>
          <button type="submit" className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
            Add
          </button>
        </form>
      )}
    </div>
  );
}

export default TodoList;