import { Link, useLocation } from "react-router-dom";
import { logout } from "../services/auth";

export default function Navbar() {
  const { pathname } = useLocation();
  const item = (to, label) => (
    <Link
      to={to}
      className={
        "px-3 py-2 rounded " +
        (pathname === to ? "bg-white text-gray-900" : "bg-gray-800 text-white")
      }
    >
      {label}
    </Link>
  );
  return (
    <div className="flex items-center gap-2 p-4 bg-gray-900 border-b border-gray-800">
      <div className="text-xl text-white font-semibold mr-4">VYTS</div>
      <div className="flex gap-2">
        {item("/", "Makineler")}
        {item("/maintenance", "Bakımlar")}
        {item("/parts", "Parçalar")}
        {item("/faults", "Arızalar")}
        {item("/alerts", "Uyarılar")}
      </div>
      <div className="flex-1" />
      <button className="px-3 py-2 rounded bg-white text-gray-900" onClick={logout}>
        Çıkış
      </button>
    </div>
  );
}
