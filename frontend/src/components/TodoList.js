import React, { useState, useEffect } from "react";

const API_URL = "http://localhost:5001/api";

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

function TodoList({ username, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [targetDatetime, setTargetDatetime] = useState("");

  useEffect(() => {
    fetchTodos();
  }, [username]);

  // READ
  const fetchTodos = async () => {
    try {
      const response = await fetch(`${API_URL}/todos/${username}`);
      if (!response.ok) return;
      const data = await response.json();
      setTodos(data);
    } catch (err) {
      console.error(err);
    }
  };

  // CREATE
  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || !targetDatetime) return;

    try {
      const response = await fetch(`${API_URL}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          task: newTask,
          status: "Todo",
          targetDatetime,
        }),
      });

      if (!response.ok) return;

      const newTodo = await response.json();
      setTodos([newTodo, ...todos]);
      setNewTask("");
      setTargetDatetime("");
    } catch (err) {
      console.error(err);
    }
  };

  // UPDATE STATUS
  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) return;

      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, status: newStatus } : todo
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // DELETE
  const handleDeleteTodo = async (id) => {
    try {
      const response = await fetch(`${API_URL}/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) return;

      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (err) {
      console.error(err);
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
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

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
          />

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Add Task
          </button>
        </form>
      </div>

      {/* Status Groups - Three Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TODO Column */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-yellow-500 px-4 py-3">
            <h3 className="text-lg font-bold text-white"> Todo</h3>
            <p className="text-yellow-100 text-sm">{todoList.length} tasks</p>
          </div>

          <ul className="divide-y max-h-96 overflow-y-auto">
            {todoList.length === 0 ? (
              <li className="px-4 py-8 text-center text-gray-400">
                No tasks yet
              </li>
            ) : (
              todoList.map((todo) => (
                <TaskCard
                  key={todo.id}
                  todo={todo}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTodo}
                />
              ))
            )}
          </ul>
        </div>

        {/* DOING Column */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-blue-500 px-4 py-3">
            <h3 className="text-lg font-bold text-white"> Doing</h3>
            <p className="text-blue-100 text-sm">{doingList.length} tasks</p>
          </div>

          <ul className="divide-y max-h-96 overflow-y-auto">
            {doingList.length === 0 ? (
              <li className="px-4 py-8 text-center text-gray-400">
                No tasks in progress
              </li>
            ) : (
              doingList.map((todo) => (
                <TaskCard
                  key={todo.id}
                  todo={todo}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTodo}
                />
              ))
            )}
          </ul>
        </div>

        {/* DONE Column */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-green-500 px-4 py-3">
            <h3 className="text-lg font-bold text-white">Done</h3>
            <p className="text-green-100 text-sm">{doneList.length} tasks</p>
          </div>

          <ul className="divide-y max-h-96 overflow-y-auto">
            {doneList.length === 0 ? (
              <li className="px-4 py-8 text-center text-gray-400">
                No completed tasks
              </li>
            ) : (
              doneList.map((todo) => (
                <TaskCard
                  key={todo.id}
                  todo={todo}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTodo}
                />
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ todo, onStatusChange, onDelete }) {
  const overdue = isOverdue(todo.targetDatetime);
  const isDone = todo.status === "Done";

  return (
    <li className={`px-4 py-4 hover:bg-gray-50 transition ${isDone ? "bg-gray-100" : ""}`}>
      <div className="space-y-2">
        {/* Task Title */}
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-gray-800 flex-1 ${isDone ? "line-through text-gray-500" : ""}`}>
            {todo.task}
          </p>
          <button
            onClick={() => onDelete(todo.id)}
            className="text-gray-400 hover:text-red-500 transition text-lg flex-shrink-0"
            title="Delete task"
          >
            🗑️
          </button>
        </div>

        {/* Deadline */}
        <div className={`flex items-center gap-1 text-xs font-medium ${
          overdue && !isDone ? "text-red-600" : "text-gray-600"
        }`}>
          <span className="text-base">🕐</span>
          <span>{formatDateTime(todo.targetDatetime)}</span>
          {overdue && !isDone && <span className="text-red-600 ml-1">Overdue!</span>}
        </div>

        {/* Status Selector */}
        <select
          value={todo.status}
          onChange={(e) => onStatusChange(todo.id, e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
