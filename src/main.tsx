
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./lib/ErrorBoundary";
  import "./styles/index.css";

  // React mounts the entire single-page app into the #root element from index.html.
  createRoot(document.getElementById("root")!).render(<ErrorBoundary><App /></ErrorBoundary>);
  
