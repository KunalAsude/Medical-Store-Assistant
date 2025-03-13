import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Internal function to format the LLM response
const formatResponse = (text) => {
  try {
    const result = {
      summary: "",
      symptoms: [],
      remedies: [],
      precautions: []
    };

    // Extract summary
    const summaryMatch = text.match(/summary:?(.*?)(?=symptoms|key symptoms|$)/is);
    if (summaryMatch && summaryMatch[1]) {
      result.summary = summaryMatch[1]
        .replace(/\*\*brief summary:\*\*/i, '')
        .replace(/\*\*summary:\*\*/i, '')
        .replace(/brief summary:/i, '')
        .replace(/summary:/i, '')
        .trim();
    }

    // Extract symptoms (limit to 2)
    const symptomsMatch = text.match(/symptoms:?(.*?)(?=remedies|home remedies|$)/is);
    if (symptomsMatch && symptomsMatch[1]) {
      result.symptoms = symptomsMatch[1]
        .split(/\n|•|-|\*/)
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .slice(0, 2); // Take only the first 2 symptoms
    }

    // Extract remedies (limit to 2)
    const remediesMatch = text.match(/remedies:?(.*?)(?=precautions|$)/is);
    if (remediesMatch && remediesMatch[1]) {
      result.remedies = remediesMatch[1]
        .split(/\n|•|-|\*/)
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .slice(0, 2); // Take only the first 2 remedies
    }

    // Extract precautions (limit to 2)
    const precautionsMatch = text.match(/precautions:?(.*)/is);
    if (precautionsMatch && precautionsMatch[1]) {
      result.precautions = precautionsMatch[1]
        .split(/\n|•|-|\*/)
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .slice(0, 2); // Take only the first 2 precautions
    }

    return result;
  } catch (error) {
    console.error("Error in formatResponse:", error);
    return {
      summary: "Error processing information.",
      symptoms: [],
      remedies: [],
      precautions: []
    };
  }
};


app.post('/chat', async (req, res) => {
    try {
        const { userInput } = req.body;
        
        console.log("Received request with userInput:", userInput);
        
        const prompt = `Provide information about ${userInput} with these sections:
        1. A brief summary (one paragraph only)
        2. Key symptoms (list format)
        3. Home remedies (list format)
        4. Precautions (list format)
        
        Be concise and factual. Do not use redundant headings like "**Summary:** Summary:" or "Brief Summary:" - just use single headings.`;
        
        const response = await axios.post(
            'https://api.together.xyz/v1/chat/completions',
            {
                model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 800,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
            }
        );
        
        // Ensure choices exist and contain a valid message
        if (response?.data?.choices?.length > 0 && response.data.choices[0]?.message?.content) {
            const aiMessage = response.data.choices[0].message.content;
            
            try {
                const formattedData = formatResponse(aiMessage);
                
                if (!formattedData || typeof formattedData !== 'object') {
                    console.error("Error: formatResponse returned an invalid format", formattedData);
                    res.json({ error: "Invalid formatted response" });
                } else {
                    console.log("Formatted AI response:", formattedData);
                    res.json(formattedData);
                }
            } catch (error) {
                console.error("Error formatting response:", error);
                res.json({ error: "Failed to process AI response", summary: "There was an error processing your request." });
            }
        } else {
            console.error("Invalid AI response format:", response?.data);
            res.json({ error: "Invalid AI response", summary: "The AI service returned an invalid response." });
        }
    } catch (error) {
        console.error("Server error:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
        res.status(500).json({ 
            error: 'Something went wrong!',
            summary: "The server encountered an error while processing your request."
        });
    }
});

// Add a simple test endpoint to verify the server is running
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));