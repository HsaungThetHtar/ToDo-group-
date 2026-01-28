import React, { useState, useEffect } from "react";
import { api } from "../api/api"; // Add this import

// Format datetime for display
const formatDateTime = (dateString) => {
  if (!dateString) return "No target date";
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
  const [newTask, setNewTask] = useState("");
  const [targetDatetime, setTargetDatetime] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchTodos();
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

  // READ - Now uses token automatically!
  const fetchTodos = async () => {
    try {
      const data = await api.getTodos();
      setTodos(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
      // If token is invalid, logout
      if (err.message.includes("token") || err.message.includes("Invalid")) {
        onLogout();
      }
    }
  };

  // CREATE - Now uses token automatically!
  const handleAddTodo = async (e) => {
  e.preventDefault();
  setError("");

  if (!newTask.trim()) {
    setError("Task is required");
    return;
  }

  if (!targetDatetime) {
    setError("Please select a date and time"); // Better error message
    return;
  }

  try {
    const newTodo = await api.addTodo(newTask, targetDatetime);
    
    setTodos([newTodo, ...todos]);
    setNewTask("");
    setTargetDatetime("");

  } catch (err) {
    console.error("Error adding todo:", err);
    setError(err.message || "Failed to add todo");
    
    if (err.message.includes("token")) {
      onLogout();
    }
  }
};

  // UPDATE STATUS - Now uses token automatically!
  const handleStatusChange = async (id, newStatus, newTargetDate) => {
  try {
    const todo = todos.find(t => t.id === id);
    const targetDateToUse = newTargetDate || todo.target_datetime;
    
    await api.updateTodo(id, newStatus, targetDateToUse);

    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, status: newStatus, target_datetime: targetDateToUse } : todo
      )
    );
  } catch (err) {
    console.error(err);
    setError(err.message);
  }
};

  // DELETE - Now uses token automatically!
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
    new Date(b.target_datetime) - new Date(a.target_datetime);

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
        {profile && (
          <img 
            src={`http://localhost:5001${profile.profile_image}`} 
            alt={profile.full_name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-400 ring-offset-2 cursor-pointer hover:ring-blue-600 hover:ring-4 transition-all"
            onClick = {(onGoToProfile)}
            
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

    {/* Add Task Form */}
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Task</h3>
      <form onSubmit={handleAddTodo} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="datetime-local"
          value={targetDatetime}
          onChange={(e) => setTargetDatetime(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          Add Task
        </button>
      </form>
    </div>

    {/* Status Columns */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <TaskColumn title="Todo" color="yellow" list={todoList}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteTodo}
      />
      <TaskColumn title="Doing" color="blue" list={doingList}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteTodo}
      />
      <TaskColumn title="Done" color="green" list={doneList}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteTodo}
      />
    </div>
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
  const overdue = isOverdue(todo.target_datetime);
  const isDone = todo.status === "Done";
  const [isEditingDate, setIsEditingDate] = React.useState(false);
  const [newDate, setNewDate] = React.useState(todo.target_datetime);

  const handleDateChange = async () => {
    if (newDate !== todo.target_datetime) {
      await onStatusChange(todo.id, todo.status, newDate);
    }
    setIsEditingDate(false);
  };

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
          {isEditingDate ? (
            <div className="flex gap-2 flex-1">
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleDateChange}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                ✓
              </button>
              <button
                onClick={() => setIsEditingDate(false)}
                className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              🕐 <button
                onClick={() => setIsEditingDate(true)}
                className="hover:underline cursor-pointer"
              >
                {formatDateTime(todo.target_datetime)}
              </button>
              {overdue && !isDone && <span className="ml-1">Overdue!</span>}
            </>
          )}
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

export default TodoList;