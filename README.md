# AI-Buddy

AI-Buddy is a conversational AI web application built with React. It allows users to practice their English speaking skills by engaging in natural, voice-based conversations with an AI-powered partner. The application uses the browser's built-in speech recognition and synthesis capabilities and integrates with large language models to provide an interactive and engaging experience.

## Features

* **Voice-based Interaction:** Speak directly to the AI and receive spoken responses.
* **Real-time Conversation:** Engages in natural, flowing conversations.
* **English Speaking Practice:** A tool to help users build confidence in their spoken English.
* **AI-Powered:** Utilizes powerful language models to understand and respond to users.
* **Roleplaying Support:** Can engage in roleplaying scenarios for more dynamic conversations.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* Node.js and npm (or yarn) installed on your machine.
* An API key from a compatible AI service provider (e.g., OpenAI, OpenRouter).

### Installation

1.  Clone the repository:
    ```sh
    git clone [https://github.com/erdashrath/ai-buddy.git](https://github.com/erdashrath/ai-buddy.git)
    ```
2.  Navigate to the project directory:
    ```sh
    cd ai-buddy
    ```
3.  Install the dependencies:
    ```sh
    npm install
    ```

### Configuration

The application requires API keys to connect to the AI services. You will need to create a `.env` file in the root of the project and add your API keys.

1.  Create a file named `.env` in the project's root directory.
2.  Add the following lines to the `.env` file, replacing the placeholder text with your actual API keys:

    ```
    OPENROUTER_API_KEY=your_openrouter_api_key
    REACT_APP_OPENAI_API_KEY=your_openai_api_key
    ```

## Available Scripts

In the project directory, you can run:

* `npm start`: Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
* `npm test`: Launches the test runner in interactive watch mode.
* `npm run build`: Builds the app for production to the `build` folder.
* `npm run eject`: Ejects the app from Create React App, exposing the build tools and configurations.

## Current Status

This project is currently under active development. New features and improvements are being added.

## Contributing

Contributions are welcome! If you have suggestions or want to contribute to the code, please feel free to open an issue or submit a pull request.
