import React, { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom"; // Add this import
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
    <BrowserRouter> {/* Add this wrapper */}
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* HEADER */}
        <header className="w-full bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={ceiLogo} alt="CEI Logo" className="h-10" />
            <h1 className="text-xl font-semibold text-gray-800">
              CEI Todo App
            </h1>
          </div>

          
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
                onGoToProfile={() => setPage("profile")}
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
    </BrowserRouter> 
  );
}

export default App;