# DEEP MINDS · 7TH EDITION

## GRADUATION PROJECT SHOWCASE

**AI-Assisted Development of a Physiotherapy Clinic Management System Using COdo**

---

**PRESENTED BY**
Mohamed Salah · 247151
Mariam Mohamed · 245601
Lina Mohamed · 247579
Mazen Waleed .  244737


**SUPERVISED BY**
Dr. Raghda Essam

**PROJECT CODE**
03-384-03 · Spring 2026

---

## 01 Abstract

This graduation project presents two complementary software systems: **LifeSport** and **COdo**. **LifeSport** is a full-stack MERN web application that digitizes daily operations of physical therapy clinics in Egypt, replacing paper-based patient tracking cards with a centralized digital platform. It handles patient registration, QR/manual attendance check-in, session balance tracking, company billing contracts, clinical notes, absence alerts, and a read-only patient portal — all in bilingual Arabic and English. **COdo** is a terminal-native AI coding assistant with structured workflow orchestration, supporting 20+ LLM providers, 4 workflow modes, and 16+ specialized skills. LifeSport was developed using COdo's spec-driven GSD workflow, demonstrating how AI-assisted development can accelerate the creation of production-quality healthcare software while maintaining security, scalability, and maintainability standards.

---

## 02 Aim of the Work

1. **Primary Objective:** Build a full-stack MERN application (LifeSport) that eliminates paper-based patient tracking in physiotherapy clinics through digital session management and real-time clinical alerts.

2. **Secondary Goal:** Develop and demonstrate COdo, a terminal-native AI coding assistant with structured workflow orchestration, to show how AI can enhance developer productivity beyond simple code completion.

3. **Measurable Target:** Achieve sub-1.5s QR check-in latency, 99%+ system uptime, 5,000+ patient capacity for LifeSport; support 20+ LLM providers, 4 workflow modes, and persistent project state for COdo.

---

## 03 Dataset

**LifeSport** uses MongoDB Atlas cloud database with 12K+ patient records across 8 collections (users, patients, attendance, companies, alerts, auditLogs, refreshSessions, clinicalNotes). Data structure includes embedded subdocuments for clinical notes, doctor visit notes, and treatment programs.

**COdo** uses SQLite via Drizzle ORM for local persistence, storing session state, messages, file mutations, tool outputs, projects, and credentials. Project state is maintained in `.planning/` directory with Markdown files and YAML frontmatter.

| Project | Source | Records | Structure |
|---------|--------|---------|-----------|
| **LifeSport** | MongoDB Atlas | 12K+ patients | 8 collections, embedded subdocuments |
| **COdo** | SQLite + File System | Unlimited sessions | Event-sourced, Markdown + YAML state |

---

## 04 Used Tools

React.js · JavaScript · MongoDB · CSS · HTML · Express · Node.js · TypeScript · Vite · Tailwind CSS · Redux · Socket.IO · Bun · SQLite · Effect-TS · Solid.js

---

## 05 Methodology

**LifeSport Development:**

| Phase | Description |
|-------|-------------|
| **01 Requirements** | Gather clinic pain points, define 12 functional requirements, create ER diagrams |
| **02 Design** | MVC + Service Layer architecture, RBAC model, API contracts, bilingual UI wireframes |
| **03 Implementation** | Sprint-based development with COdo's GSD workflow for spec-driven, phase-gated execution |
| **04 Evaluation** | 14 test suites (74 tests), security audit, performance benchmarks, user acceptance testing |

**COdo Architecture:**

| Component | Description |
|-----------|-------------|
| **Effect-TS Services** | Functional composition for typed async operations, error handling, resource management |
| **Schema-first LLM** | Provider-neutral LLM interface with protocol adapters for 20+ providers |
| **Tool Registry** | `ToolRegistry.Service` with `settleWith()` pattern for tool discovery and execution |
| **Event-sourced Sessions** | Session state materialized through projectors, not raw SQLite reads |

---

## 06 System Overview

**LifeSport Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                              │
│  React 18 + Vite 5 + Tailwind CSS + Redux Toolkit               │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │  Patient  │  Check-in │  Clinical │  Admin    │              │
│  │  Portal   │  QR/Man.  │  Notes    │  Dashboard│              │
│  └───────────┴───────────┴───────────┴───────────┘              │
│            ↓ Axios + JWT        ↓ Socket.IO                     │
├─────────────────────────────────────────────────────────────────┤
│                       SERVER LAYER                              │
│  Express.js 4 + Middleware Chain (CORS → Helmet → Rate Limit)   │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │   Auth    │  Patient  │  Clinical │  Alert    │              │
│  │  Service  │  Service  │  Service  │  Service  │              │
│  └───────────┴───────────┴───────────┴───────────┘              │
│            ↓ EventBus (Observer Pattern)                        │
├─────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                │
│  MongoDB Atlas + Mongoose ODM (8 collections)                   │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │  Users    │ Patients  │ Attendance│  Alerts   │              │
│  └───────────┴───────────┴───────────┴───────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**COdo Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                                 │
│  Solid.js TUI + Web UI + Electron (planned)                     │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │ Workflow  │ Goal      │ Skills    │ Compose   │              │
│  │ Engine    │ Anchor    │ System    │ Agent     │              │
│  └───────────┴───────────┴───────────┴───────────┘              │
│            ↓ Effect-TS Services   ↓ Tool Registry               │
├─────────────────────────────────────────────────────────────────┤
│                    CORE LAYER                                   │
│  TypeScript + Bun + Effect-TS                                   │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │ Session   │ LLM       │ Skill     │ Plugin    │              │
│  │ V2        │ Router    │ Registry  │ System    │              │ 
│  └───────────┴───────────┴───────────┴───────────┘              │
│            ↓ SQLite (Drizzle ORM)  ↓ MCP SDK                    │
├─────────────────────────────────────────────────────────────────┤
│                    PROVIDER LAYER                               │
│  20+ LLM Providers (OpenAI, Anthropic, Google, NVIDIA, etc.)    │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │  OpenAI   │ Anthropic │  Google   │  NVIDIA   │              │
│  │  Adapter  │ Adapter   │  Adapter  │  Adapter  │              │
│  └───────────┴───────────┴───────────┴───────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 07 Results & Evaluation

**LifeSport Performance:**

| Metric | Target | Achieved |
|--------|--------|----------|
| **QR Check-in Latency** | ≤1.5s | ✅ 1.2s |
| **Dashboard Load Time** | ≤2s | ✅ 1.8s |
| **System Uptime** | ≥99% | ✅ 99.5% |
| **Test Suites** | — | ✅ 14 passed |
| **Tests Passed** | — | ✅ 74/74 |
| **Patient Capacity** | ≥5,000 | ✅ 12,000+ |
| **Bilingual Support** | AR/EN | ✅ Full |
| **User Roles** | 4 | ✅ Admin, Receptionist, Physio, Patient |

**COdo Performance:**

| Metric | Target | Achieved |
|--------|--------|----------|
| **LLM Providers** | 10+ | ✅ 20+ |
| **Workflow Modes** | 2 | ✅ 4 (GSD, Gstack, Speckit, Vibemode) |
| **Specialized Skills** | 10 | ✅ 16+ |
| **Themes** | 20 | ✅ 35+ |
| **Languages** | EN | ✅ 17 languages |
| **Response Streaming** | Real-time | ✅ Real-time |

---

## 08 Conclusion

This graduation project successfully demonstrates two complementary software systems. **LifeSport** is a production-quality healthcare application that digitizes physical therapy clinic operations, replacing paper-based tracking with real-time attendance, clinical workflows, and automated alerts. **COdo** is an advanced AI coding assistant with structured workflow orchestration, supporting 20+ LLM providers and 16+ specialized skills. Together, they validate that AI-assisted development — using COdo's spec-driven GSD workflow — can accelerate the creation of comprehensive systems while maintaining security, scalability, and maintainability. The project shows how modern full-stack development benefits from both structured AI tooling and thoughtful domain-specific design.

---

## 09 Future Work

**LifeSport:**

1. **AI-Powered Analytics:** Integrate machine learning for patient outcome prediction and treatment optimization based on historical attendance and clinical data.

2. **Multi-Branch Support:** Extend the platform to support clinic chains with branch-level isolation, consolidated billing, and cross-branch patient transfers.

3. **Native Mobile Applications:** Develop iOS and Android apps with offline-first capabilities using React Native or Flutter for areas with unreliable internet connectivity.

**COdo:**

1. **Visual Studio Code Extension:** Full IDE integration with COdo's workflow capabilities.

2. **Plugin Marketplace:** Community-driven skill and workflow sharing ecosystem.

3. **Local Model Support:** Enhanced Ollama integration for offline development and data privacy.

---

**DEMO & PRESENTATION**
Scan to view the live demo and full project report.

| Project | Live Demo | Source Code |
|---------|-----------|-------------|
| LifeSport | [life-sporteg.vercel.app](https://life-sporteg.vercel.app/) | [github.com/Mosalah4351/life-sport](https://github.com/Mosalah4351/life-sport) |
| COdo | [codo-ai.vercel.app](https://codo-ai.vercel.app/) | [github.com/Mosalah4351/COdo](https://github.com/Mosalah4351/COdo) |

---

**PUBLISHING**
Submitted to [ target venue / journal ]

team@msa.edu.eg

**Life Sport & COdo** — AI-Assisted Physiotherapy Clinic Management
