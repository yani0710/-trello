# мини Trello

`мини Trello` е локален full-stack уеб проект за управление на проекти по Kanban методология. Изграден е с `Node.js + Express`, frontend с `HTML/CSS/JavaScript` и `SQLite` база данни.

## Основни възможности

- регистрация, вход и изход
- роли `Administrator` и `User`
- активни/неактивни потребители
- dashboard с бордове
- създаване и изтриване на бордове
- стандартни колони `To Do`, `In Progress`, `Done`
- добавяне, преименуване, изтриване и подреждане на колони
- задачи с заглавие, описание, срок, приоритет, автор, отговорник и цветен етикет
- преместване на задачи между колони, включително drag and drop
- коментари към задачи
- история на преместванията
- контрол на достъп до бордове
- администраторски панел за управление на потребители и board memberships
- activity log за важни действия

## Технологии

- Backend: `Node.js`, `Express`
- Frontend: `HTML`, `CSS`, `JavaScript`
- Database: `SQLite`
- Session auth: `express-session` + `connect-sqlite3`
- Password hashing: `bcryptjs`

## Структура на проекта

```text
мини Trello/
├─ client/
│  ├─ assets/
│  │  ├─ css/
│  │  │  └─ styles.css
│  │  └─ js/
│  │     ├─ admin.js
│  │     ├─ api.js
│  │     ├─ board.js
│  │     ├─ common.js
│  │     ├─ dashboard.js
│  │     ├─ login.js
│  │     ├─ profile.js
│  │     └─ register.js
│  ├─ admin.html
│  ├─ board.html
│  ├─ dashboard.html
│  ├─ login.html
│  ├─ profile.html
│  └─ register.html
├─ server/
│  ├─ data/
│  └─ src/
│     ├─ config/
│     ├─ controllers/
│     ├─ database/
│     ├─ middleware/
│     ├─ routes/
│     ├─ services/
│     ├─ utils/
│     ├─ app.js
│     └─ index.js
├─ .gitignore
├─ package.json
└─ README.md
```

## Инсталация и стартиране

```bash
npm install
npm run db:init
npm run db:seed
npm start
```

Приложението ще се отвори на:

```text
http://localhost:3000
```

За разработка можеш да използваш:

```bash
npm run dev
```

## Demo login данни

### Администратор
- Email: `admin@mini-trello.local`
- Password: `admin123`

### Потребители
- Email: `maria@mini-trello.local`
- Password: `user1234`

- Email: `ivan@mini-trello.local`
- Password: `user1234`

## Основни модули

- `server/src/database`: SQLite schema, init логика и seed скрипт.
- `server/src/services`: бизнес логика за auth, boards, tasks и admin операции.
- `server/src/controllers`: свързва HTTP request/response с услугите.
- `server/src/routes`: API route-ове.
- `server/src/middleware`: auth, role checks и async error handling.
- `client/assets/js`: frontend логика по страници.
- `client/assets/css/styles.css`: общ responsive UI стил.

## API и бизнес правила

- само логнат потребител може да достъпва бордове и задачи
- само член на борд вижда съдържанието му, освен ако е администратор
- само owner или admin може да изтрие борд
- празни заглавия не се позволяват
- не може да се изтрие колона, ако има задачи в нея
- при всяко местене на задача се записва history запис
- паролите се пазят само като hash
- неактивен потребител не може да влиза

## Seed съдържание

Seed скриптът създава:

- 1 администратор
- 2 стандартни потребителя
- 2 примерни борда
- стандартни колони
- примерни задачи
- примерни коментари
- примерна активност

## Забележки

- SQLite файлът се създава в `server/data/mini-trello.sqlite`
- Сесиите също се пазят локално чрез SQLite store
- Проектът е подходящ за училищен проект и локално демо без сложна конфигурация
