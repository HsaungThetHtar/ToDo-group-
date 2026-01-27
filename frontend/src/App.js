// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import TodoList from './components/TodoList';
import ceiLogo from './assets/cei-logo.png';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('todo_username');
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  const handleLogin = (username) => {
    localStorage.setItem('todo_username', username);
    setCurrentUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('todo_username');
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* HEADER (Top on all screens) */}
      <header className="
        w-full
        bg-white
        shadow-sm
        px-4
        sm:px-6
        lg:px-10
        py-4
        flex
        items-center
        justify-center
      ">
        <div className="flex items-center gap-3">
          <img
            src={ceiLogo}
            alt="CEI Logo"
            className="h-8 sm:h-10 lg:h-12"
          />
          <h1 className="
            text-lg
            sm:text-xl
            lg:text-2xl
            font-semibold
            text-gray-800
          ">
            CEI Todo App
          </h1>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="
        flex-1
        w-full
        p-4
        sm:p-6
        lg:p-10
      ">
        <div className="
          w-full
          h-full
          bg-white
          rounded-xl
          shadow
          p-4
          sm:p-6
          lg:p-8
        ">
          {currentUser ? (
            <TodoList
              username={currentUser}
              onLogout={handleLogout}
            />
          ) : (
            <Login onLogin={handleLogin} />
          )}
        </div>
      </main>

    </div>
  );
}

export default App;
