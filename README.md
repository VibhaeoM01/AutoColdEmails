# Automatic Email Sender

A Node.js and React-based application to send personalized emails with attachments (such as resumes) to multiple recipients, with random delays between sends. Useful for students or professionals applying to multiple opportunities.

## Features
- Send emails with a custom template and attachment to a list of recipients
- Random delay between each email to avoid spam filters
- Progress tracking endpoints
- Prevents concurrent email batches
- Simple React frontend (in `/frontend`)

## Prerequisites
- Node.js (v14 or higher recommended)
- npm (comes with Node.js)
- A Gmail account for sending emails (or modify for another provider)

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/automaticemail.git
cd automaticemail
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the root directory:

```
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
```
> **Note:** For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833) if 2FA is enabled.

### 4. Add Your Attachment
Place your resume or desired attachment in the `attachments/` folder and name it `resume.pdf` (or update the filename in `server.js`).

### 5. Start the Backend Server
```bash
node server.js
```
The server will run on [http://localhost:5000](http://localhost:5000).

### 6. (Optional) Setup and Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on [http://localhost:5173](http://localhost:5173) by default.

## API Endpoints
- `POST /send-emails` — Start sending emails. Body: `{ "emails": ["email1@example.com", "email2@example.com", ...] }`
- `GET /sent-count` — Get the number of emails sent so far.
- `GET /send-times` — Get detailed send times and statuses for each email.

## Usage
1. Start the backend server.
2. (Optional) Start the frontend for a UI.
3. Use the frontend or send a POST request to `/send-emails` with a list of recipient emails.
4. Track progress via `/sent-count` or `/send-times`.

## Available Commands
- `npm install` — Install backend dependencies
- `node server.js` — Start backend server
- `cd frontend && npm install` — Install frontend dependencies
- `cd frontend && npm run dev` — Start frontend development server

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE) 