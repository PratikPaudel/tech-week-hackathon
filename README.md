# Tidy Mind

A personal knowledge management and Q&A application that helps you organize your thoughts, insights, and knowledge in a clean, searchable, and well-structured way.

## 🎯 What is Tidy Mind?

Tidy Mind is your private knowledge vault - a place to capture, organize, and retrieve your personal Q&A pairs. Think of it as having your own searchable encyclopedia of knowledge, thoughts, and insights that evolves with your understanding over time.

## ✨ Key Features

### 🗂️ **Folder Organization**
- Create folders to categorize different topics or areas of knowledge
- Add descriptions and tags to folders for better organization
- View folder statistics (question count, answered count)
- Archive folders when no longer needed

### ❓ **Questions & Answers**
- Add questions to any folder
- Write detailed answers with rich text editing using TipTap
- Support for headings, bold, italic, lists, quotes, and code blocks
- Syntax highlighting for code blocks (JavaScript, TypeScript, Python, SQL, JSON, Bash)
- Version control for answers - save multiple versions as your understanding evolves
- Track answer statistics (character count, word count, reading time)
- Mark questions as favorites for quick access

### 🔍 **Powerful Search**
- Full-text search across all questions and answers
- Filter search results by folders
- Search with highlighted snippets for quick context
- Find exactly what you're looking for instantly

### ⚡ **Quick Add**
- Rapidly capture Q&A pairs through a convenient modal
- Auto-assign to existing folders or create a "General" folder
- Perfect for capturing thoughts on the go

### 🏷️ **Smart Organization**
- Tag questions for better categorization
- Reorder questions within folders
- Archive old content without losing it
- Clean, intuitive interface

### 🔐 **Privacy First**
- User authentication ensures your data stays private
- Row-level security - you only see your own knowledge
- No sharing between users - your vault is truly personal

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives with custom styling
- **Rich Text Editor**: TipTap for answer composition
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase real-time subscriptions
- **Security**: Row-level security policies

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Theme**: Next-themes for dark/light mode support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tidy-mind
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `db/schema.sql` in your Supabase SQL editor
   - Copy your Supabase URL and anon key

4. **Environment Variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
tidy-mind/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main application routes
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── answers/           # Answer-related components
│   ├── auth/              # Authentication components
│   ├── folders/           # Folder management components
│   ├── questions/         # Question-related components
│   ├── quick-add/         # Quick add functionality
│   ├── search/            # Search components
│   └── ui/                # Reusable UI components
├── db/                    # Database schema and migrations
├── lib/                   # Utility functions and configurations
└── public/                # Static assets
```

## 🗄️ Database Schema

The application uses three main tables:

- **`folders`**: Organize your knowledge into categories
- **`questions`**: Store your questions with tags and metadata
- **`answers`**: Version-controlled answers with rich text content

Key features:
- Row-level security for user privacy
- Full-text search indexes
- Automatic versioning for answers
- Statistics views for insights

## 🎨 Features in Detail

### Version Control
Every answer can have multiple versions, allowing you to track how your understanding evolves over time. Each version can have a custom name and notes.

### Search & Discovery
The full-text search uses PostgreSQL's built-in search capabilities with:
- Weighted search (questions weighted higher than answers)
- Highlighted snippets in search results
- Filtering by folders
- Pagination for large result sets

### Quick Add Workflow
1. Click "Add Knowledge" button
2. Enter your question and answer
3. Select a folder (or use default)
4. Save instantly - the system handles folder creation if needed

### Responsive Design
The application works seamlessly across:
- Desktop computers
- Tablets
- Mobile devices

## 🔒 Security

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row-level security ensures users only access their own data
- **Data Privacy**: No data sharing between users
- **Secure API**: All database operations go through Supabase's secure API

## 🚧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## 🤝 Support

For support or questions, please open an issue in the repository.

---

**Tidy Mind** - Organize your thoughts, one question at a time.
