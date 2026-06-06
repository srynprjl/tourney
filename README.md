# TourneyPro - Microservices Tournament Management System

TourneyPro is a robust, professional-grade tournament management application built with a microservices architecture. It allows users to create and manage complex competitive events, from simple group stages to multi-stage hybrid tournaments with automatic bracket generation and real-time standings.

![Tournament View](https://img.shields.io/badge/Architecture-Microservices-blue)
![Backend](https://img.shields.io/badge/Backend-Go%20%2F%20Gin-00ADD8)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2F%20Tailwind%20%2F%20Shadcn-61DAFB)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)

## 🚀 Key Features

- **Microservices Architecture:** Scalable and isolated services for Authentication, Tournament logic, and Match scoring.
- **Advanced Tournament Formats:**
    - **Group Phase:** Circular round-robin scheduling with interleaved matchdays for a professional "League" feel.
    - **Double Round Robin:** Support for Home & Away fixtures.
    - **Knockout Brackets:** Smart bracket generation that handles any number of teams using the power-of-2 reduction method (minimizing byes).
    - **Hybrid Tournaments:** Ability to promote the top $X$ teams from groups into a subsequent knockout phase.
- **Real-Time Standings:** Group tables that update instantly as match results are entered (Win=3, Draw=1, Loss=0).
- **Pro UI/UX:** Modern, responsive dashboard built with **Shadcn UI** and **Tailwind CSS v4**, featuring a persistent sidebar and **Dark/Light Mode**.
- **Service Security:** JWT-based authentication for both user-to-service and service-to-service communication.
- **Data Integrity:** Cascaded deletions and strict team count enforcement for multi-group tournaments.

## 🏗️ Architecture

The system consists of four primary containers:

1.  **`auth-service` (Go):** Handles user registration, login, and JWT issuance/verification.
2.  **`tournament-service` (Go):** The core engine for tournament CRUD, team management, group randomization, and bracket generation.
3.  **`match-service` (Go):** Manages score entry and automatic winner advancement logic.
4.  **`frontend` (React):** A polished Single Page Application (SPA) served via Nginx.
5.  **`postgres` (DB):** Shared relational database for persistent storage.

## 🛠️ Tech Stack

- **Backend:** Go (Golang), Gin Gonic, GORM.
- **Frontend:** React 18, Vite, Tailwind CSS v4, Shadcn UI, Radix UI Primitives, Lucide Icons.
- **Infrastructure:** Docker, Docker Compose, Nginx.

## 🚦 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Installation & Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/tourney-pro.git
    cd tourney-pro
    ```

2.  Spin up the infrastructure:
    ```bash
    docker-compose up --build
    ```

3.  Access the application:
    - **Frontend:** [http://localhost:3000](http://localhost:3000)
    - **Auth API:** [http://localhost:8081](http://localhost:8081)
    - **Tournament API:** [http://localhost:8082](http://localhost:8082)
    - **Match API:** [http://localhost:8083](http://localhost:8083)

## 📖 How to Use

1.  **Register/Login:** Create an account to start managing your tournaments.
2.  **Create a Tournament:**
    - Choose **"Group Phase"** for a league table or **"Knockout"** for a bracket.
    - Set group sizes and promotion counts for hybrid stages.
    - Toggle **"Double Format"** for Home/Away or Two-Legged ties.
3.  **Manage Teams:** Add exactly the number of teams required by your settings.
4.  **Generate:** Click "Generate Matches" to create the schedule.
5.  **Enter Scores:** Input scores in the match schedule. Brackets and Standings will update automatically.
6.  **Promote:** For hybrid tournaments, click "Promote to Knockout" once the group phase is advanced to seed the top teams into the finals.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
