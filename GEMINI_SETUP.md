# Setting Up Gemini API Key

This application uses Google's Gemini AI for document processing. To make it work, you need to set up a Gemini API key.

## Steps to Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click on "Get API key" or "Create API key"
4. Copy the generated API key

## Adding the API Key to Your Application

1. In the root directory of the project, create a file named `.env.local` if it doesn't exist already
2. Add the following line to the file:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   Replace `your_api_key_here` with the actual API key you obtained from Google AI Studio

3. Save the file
4. Restart your application for the changes to take effect

## Troubleshooting

If you see errors like "API key not valid" or "Failed to extract data from document", check that:

1. Your API key is correctly copied without any extra spaces
2. The `.env.local` file is in the root directory of the project
3. You've restarted the application after adding the API key

For more information about Gemini API, visit [Google AI documentation](https://ai.google.dev/docs). 