# Shine Achiever Tool

Create a production-oriented web application named "SPR" — Student Performance Rating" for Ma'din School of Excellence.

IMPORTANT PROJECT GOAL:
This project will initially be scaffolded in Lovable and then pushed to GitHub. Further development will continue in Google Antigravity IDE. Therefore, generate clean, modular, maintainable, TypeScript-based code with a clear separation between UI components, business logic, database access, and authentication.

TECHNOLOGY:

* React
* TypeScript
* Vite
* Tailwind CSS
* Supabase-compatible PostgreSQL architecture
* Lovable Cloud for the initial database setup

APPLICATION MODULES:

1. Admin Dashboard
2. Student Management
3. Classes and Institutions
4. Academic Years
5. Islamic Studies
6. School Studies
7. Qualification
8. Creative Hub
9. Library & Reading
10. Literary Programmes
11. Programmes & Competitions
12. Student Dossier and Performance Reports
13. SPR Percentage Calculation Matrix
14. Leaderboard
15. Weight Management
16. Dynamic Categories and Assessment Records

SPR CALCULATION REQUIREMENTS:
The application must support seven top-level performance categories. Islamic Studies has a 20% weight. The remaining six categories share the remaining 80% equally.

Store the weights with sufficient numeric precision. Do not rely on rounded display values for calculations.

The final SPR percentage must be calculated from normalized category scores and their respective weights. The maximum final SPR must be exactly 100%.

STUDENT MANAGEMENT:
Support permanent, unique SPR Student IDs, student names, classes, house names, father names, dates of birth, student types, and profile photo URLs where applicable.

DATABASE AND SECURITY:

* Use a relational PostgreSQL schema.
* Create appropriate primary keys, foreign keys, unique constraints, indexes, and timestamps.
* Design role-based access control and secure authentication.
* Do not expose service-role keys, private credentials, or passwords in frontend code.
* Do not use hardcoded credentials as a security mechanism.
* Avoid unnecessary database queries and fetching entire tables when only a subset of records is needed.
* Keep database access logic modular and reusable.

DESIGN:
Create a modern, professional, responsive educational administration interface suitable for desktop and mobile devices. Use a clean academic visual style, intuitive navigation, accessible forms, data tables, search, filtering, pagination, loading states, and error states.

FIRST PHASE ONLY:
Start by establishing the application architecture, database schema, reusable layout, navigation, and initial dashboard shell. Do not fabricate student records or pretend that unfinished modules are fully functional.

Prepare the project for GitHub synchronization and continued development in Antigravity IDE.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/af0df38c-2edc-462f-a4b9-1e597d0d2cf9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
