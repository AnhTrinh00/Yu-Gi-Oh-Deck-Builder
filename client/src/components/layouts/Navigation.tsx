
import { NavLink } from "react-router-dom";

const navigation = [
  { path: "/", label: "Builder", end: true },
  { path: "/collection", label: "Collection" },
  { path: "/deck", label: "My Deck" },
  { path: "/analysis", label: "Analysis" },
];

export default function Navigation() {
  return (
    <nav className="app-navigation" aria-label="Main navigation">
      {navigation.map(({ path, label, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          className={({ isActive }) =>
            `navigation-link ${isActive ? "active" : ""}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
