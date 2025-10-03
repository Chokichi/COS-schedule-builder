#!/bin/bash

echo "🚀 Setting up Student Schedule Builder React App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
    echo ""
    echo "🎉 Setup complete! You can now run:"
    echo "   npm start"
    echo ""
    echo "This will start the development server at http://localhost:3000"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
