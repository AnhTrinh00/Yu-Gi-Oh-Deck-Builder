
import type { ReactNode } from "react";
import Navigation from "./Navigation";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <h1>Yu-Gi-Oh! Deck Builder</h1>
          <p>Build, manage, and analyze your decks.</p>
        </div>

        <Navigation />
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}
