/*
 * MCord, a Discord client modification
 * Copyright (c) 2026 Mavrom
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 */

import { createRoot } from "react-dom/client";

import { App } from "./App";

const el = document.getElementById("root");
if (el) createRoot(el).render(<App />);
