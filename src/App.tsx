import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserList from "./components/UserList";
import AdList from "./components/AdList";
import TransactionList from "./components/TransactionList";
import Profile from "./components/Profile";

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PRIVÉ */}
        <Route path="/dashboard" element={<Dashboard />}>
          <Route path="users" element={<UserList />} />
          <Route path="ads" element={<AdList />} />
          <Route path="transactions" element={<TransactionList />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
