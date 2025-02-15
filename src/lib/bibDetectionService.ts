import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY || '');

// Add delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function detectBibNumbers(file: File): Promise<string[]> {
  try {
    // Add small delay to avoid rate limits
    await delay(1000); // 1 second delay between requests
    
    // Convert file to base64
    const base64Image = await fileToBase64(file);

    // Initialize the model - using the correct model name
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Analyze this race photo and extract any visible race bib numbers. Return only the numbers, separated by commas. If no bib numbers are visible, return 'none'.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    if (text.toLowerCase() === 'none') {
      return [];
    }

    // Parse the response and extract numbers
    const numbers = text
      .split(',')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    return numbers;
  } catch (error) {
    console.error('Error detecting bib numbers with Gemini:', error);
    // Add more detailed error message
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (error.message.includes('unauthorized')) {
        throw new Error('Invalid API key. Please check your configuration.');
      }
      // Log the specific error message for debugging
      console.error('Specific error:', error.message);
    }
    throw new Error('Failed to detect bib numbers. Please try again.');
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
}

// Add this function to test your API key
export async function testGeminiAPI() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Test connection");
    const response = await result.response;
    console.log("API Connection successful:", response.text());
    return true;
  } catch (error) {
    console.error("API Connection failed:", error);
    return false;
  }
}