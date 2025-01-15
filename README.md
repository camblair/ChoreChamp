# ChoreChamp

ChoreChamp is a family-friendly web application that helps parents manage household chores for their children. With an intuitive interface and reward system, it makes doing chores fun and engaging for kids while providing parents with easy management tools.

## Features

- User authentication for parents and kids
- Easy chore assignment and management
- Progress tracking
- Reward system
- Mobile-friendly interface

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

3. Start the development server:
   ```bash
   npm run dev:full
   ```

## Technology Stack

- Frontend: React.js with Material-UI
- Backend: Node.js with Express
- Database: MongoDB
- Authentication: JWT
