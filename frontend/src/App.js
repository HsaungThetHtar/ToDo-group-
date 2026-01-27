import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import TodoList from "./components/TodoList";
import EditProfile from "./components/Profile";
import ceiLogo from "./assets/cei-logo.png";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("login");

  useEffect(() => {
    const storedUser = localStorage.getItem("todo_username");
    if (storedUser) {
      setCurrentUser(storedUser);
      setPage("todo");
    }
  }, []);

  const handleLogin = (username) => {
    localStorage.setItem("todo_username", username);
    setCurrentUser(username);
    setPage("todo");
  };

  const handleLogout = () => {
    localStorage.clear();
    setCurrentUser(null);
    setPage("login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* HEADER */}
      <header className="w-full bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src={ceiLogo} alt="CEI Logo" className="h-10" />
          <h1 className="text-xl font-semibold text-gray-800">
            CEI Todo App
          </h1>
        </div>

        {currentUser && (
          <div className="flex gap-3">
            <button
              onClick={() => setPage("profile")}
              className="text-sm px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* MAIN */}
      <main className="flex-1 p-6">
        <div className="bg-white rounded-xl shadow p-6">
          {page === "login" && (
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => setPage("register")}
            />
          )}

          {page === "register" && (
            <Register onSwitchToLogin={() => setPage("login")} />
          )}

          {page === "todo" && currentUser && (
            <TodoList
              username={currentUser}
              onLogout={handleLogout}
            />
          )}

          {page === "profile" && currentUser && (
            <EditProfile
              username={currentUser}
              onBack={() => setPage("todo")}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
