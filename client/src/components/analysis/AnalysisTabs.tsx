
import { useState, type ReactNode } from "react";

export type AnalysisTabId =
  | "overview"
  | "relationships"
  | "combos"
  | "advanced";

interface AnalysisTab {
  id: AnalysisTabId;
  label: string;
  content: ReactNode;
}

interface AnalysisTabsProps {
  tabs: AnalysisTab[];
  defaultTab?: AnalysisTabId;
}

export default function AnalysisTabs({
  tabs,
  defaultTab = "overview",
}: AnalysisTabsProps) {
  const [activeTab, setActiveTab] =
    useState<AnalysisTabId>(defaultTab);

  const selectedTab =
    tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  if (!selectedTab) {
    return null;
  }

  return (
    <div className="analysis-tabs">
      <div
        className="analysis-tab-navigation"
        role="tablist"
        aria-label="Deck analysis sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            id={`analysis-tab-${tab.id}`}
            role="tab"
            aria-selected={selectedTab.id === tab.id}
            aria-controls={`analysis-panel-${tab.id}`}
            className={
              selectedTab.id === tab.id ? "active" : ""
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        id={`analysis-panel-${selectedTab.id}`}
        role="tabpanel"
        aria-labelledby={`analysis-tab-${selectedTab.id}`}
        className="analysis-tab-panel"
      >
        {selectedTab.content}
      </section>
    </div>
  );
}
